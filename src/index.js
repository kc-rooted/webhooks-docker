const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const mondayRouter = require('./handlers/monday');
const airbyteRouter = require('./handlers/airbyte');
const healthRouter = require('./handlers/health');
const { errorHandler } = require('./middleware/errorHandler');
const { validateWebhook } = require('./middleware/validation');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/webhooks/monday', apiKeyAuth, validateWebhook('monday'), mondayRouter);
app.use('/webhooks/airbyte', apiKeyAuth, validateWebhook('airbyte'), airbyteRouter);
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

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook handler server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});