const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const cron = require('node-cron');

const mondayRouter = require('./handlers/monday');
const airbyteRouter = require('./handlers/airbyte');
const healthRouter = require('./handlers/health');
const { errorHandler } = require('./middleware/errorHandler');
const { validateWebhook } = require('./middleware/validation');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');
const WeekAssignedUpdater = require('./jobs/weekAssignedUpdater');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/webhooks/monday', apiKeyAuth, validateWebhook('monday'), mondayRouter);
app.use('/webhooks/airbyte', apiKeyAuth, airbyteRouter);
app.use('/health', healthRouter);

app.get('/', apiKeyAuth, (req, res) => {
  res.json({
    status: 'running',
    service: 'webhook-handler',
    endpoints: [
      '/webhooks/monday',
      '/webhooks/airbyte',
      '/health'
    ]
  });
});

// Temporary: Catch Monday webhooks that are going to the wrong path
app.post('/', apiKeyAuth, (req, res) => {
  console.log('WARNING: Monday webhook received at root path instead of /webhooks/monday');
  console.log('Request headers:', req.headers);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  // Check if this is a Monday webhook
  if (req.body.event || req.body.challenge) {
    console.log('This appears to be a Monday webhook - redirecting to proper handler...');
    // Forward to the Monday handler
    req.url = '/webhooks/monday/';
    return app._router.handle(req, res);
  }

  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

// Initialize scheduled jobs
if (process.env.CRON_ENABLED === 'true') {
  const weekAssignedUpdater = new WeekAssignedUpdater();
  const cronSchedule = process.env.CRON_SCHEDULE || '0 3 * * *'; // Default 3am daily
  const timezone = process.env.CRON_TIMEZONE || 'America/New_York';

  // Validate cron expression
  if (cron.validate(cronSchedule)) {
    const scheduledJob = cron.schedule(cronSchedule, async () => {
      console.log(`[CRON] Week Assigned update job triggered at ${new Date().toISOString()}`);
      try {
        await weekAssignedUpdater.updateAllBoards();
      } catch (error) {
        console.error('[CRON] Failed to run Week Assigned update:', error);
      }
    }, {
      scheduled: true,
      timezone: timezone
    });

    console.log(`Scheduled job initialized: Week Assigned updater`);
    console.log(`  Schedule: ${cronSchedule} (${timezone})`);
    console.log(`  Boards to process: ${process.env.MONDAY_BOARD_IDS || 'None configured'}`);
  } else {
    console.error(`Invalid cron expression: ${cronSchedule}`);
  }

  // Add manual trigger endpoint for testing
  app.post('/jobs/update-week-assigned', apiKeyAuth, async (req, res) => {
    try {
      console.log('Manual trigger of Week Assigned update requested');
      const results = await weekAssignedUpdater.runManually();
      res.json({
        success: true,
        message: 'Week Assigned update completed',
        results
      });
    } catch (error) {
      console.error('Manual update failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Debug endpoint to check environment variables
  app.get('/debug/env', apiKeyAuth, (req, res) => {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      API_KEY: process.env.API_KEY ? 'SET' : 'NOT SET',
      MONDAY_API_TOKEN: process.env.MONDAY_API_TOKEN ? 'SET' : 'NOT SET',
      SLACK_NOTIFICATIONS_ENABLED: process.env.SLACK_NOTIFICATIONS_ENABLED,
      SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL ? 'SET' : 'NOT SET',
      SLACK_CHANNEL: process.env.SLACK_CHANNEL,
      CRON_ENABLED: process.env.CRON_ENABLED,
      MONDAY_BOARD_IDS: process.env.MONDAY_BOARD_IDS,
      CRON_SCHEDULE: process.env.CRON_SCHEDULE,
      CRON_TIMEZONE: process.env.CRON_TIMEZONE,
      // Show all env vars that start with SLACK_ or CRON_
      allSlackVars: Object.keys(process.env).filter(key => key.startsWith('SLACK_')),
      allCronVars: Object.keys(process.env).filter(key => key.startsWith('CRON_'))
    };

    res.json({
      message: 'Environment variables debug info',
      environment: envVars,
      totalEnvVars: Object.keys(process.env).length
    });
  });

  console.log('Manual trigger endpoint available at: POST /jobs/update-week-assigned');
} else {
  console.log('Scheduled jobs disabled (CRON_ENABLED != true)');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook handler server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});