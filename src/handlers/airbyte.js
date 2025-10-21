const express = require('express');
const slackNotifier = require('../utils/slackNotifier');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    // Log the FULL raw payload to see what Airbyte is actually sending
    console.log('Airbyte webhook RAW payload:', JSON.stringify(req.body, null, 2));

    // Airbyte sends data in a nested structure
    const data = req.body.data || req.body; // Support both nested and flat formats

    // Extract connection details
    const connectionId = data.connection?.id || data.connectionId;
    const connectionName = data.connection?.name || data.connectionName;

    // Extract job details
    const jobId = data.jobId;

    // Airbyte uses 'success' boolean, not 'jobStatus' string
    // Map it to a status string for our handlers
    let jobStatus;
    if (data.success === true) {
      jobStatus = 'succeeded';
    } else if (data.success === false) {
      jobStatus = 'failed';
    } else if (data.status) {
      jobStatus = data.status; // Fallback to status field if it exists
    } else {
      jobStatus = 'unknown';
    }

    // Extract metrics
    const attemptNumber = data.attemptNumber;
    const recordsEmitted = data.recordsEmitted;
    const recordsCommitted = data.recordsCommitted;
    const bytesEmitted = data.bytesEmitted;
    const bytesCommitted = data.bytesCommitted;
    const startTime = data.startedAt ? new Date(data.startedAt).getTime() : data.startTime;
    const endTime = data.finishedAt ? new Date(data.finishedAt).getTime() : data.endTime;
    const streamStatuses = data.streamStatuses;

    console.log('Airbyte webhook received:', {
      connectionId,
      connectionName,
      jobId,
      jobStatus,
      success: data.success,
      timestamp: new Date().toISOString()
    });

    switch (jobStatus) {
      case 'succeeded':
        await handleSyncSuccess({
          connectionId,
          connectionName,
          jobId,
          recordsCommitted,
          bytesCommitted,
          duration: endTime - startTime,
          attemptNumber
        });
        break;
      case 'failed':
        await handleSyncFailure({
          connectionId,
          connectionName,
          jobId,
          attemptNumber,
          error: data.errorMessage || data.error || data.failureReason,
          errorType: data.errorType,
          errorOrigin: data.errorOrigin
        });
        break;
      case 'running':
        await handleSyncRunning({
          connectionId,
          connectionName,
          jobId,
          recordsEmitted,
          bytesEmitted
        });
        break;
      case 'cancelled':
        await handleSyncCancelled({
          connectionId,
          connectionName,
          jobId
        });
        break;
      case 'unknown':
        console.log('Airbyte webhook received with unknown status - full data:', {
          connectionId,
          connectionName,
          jobId,
          successField: data.success,
          statusField: data.status,
          hasData: !!data,
          rootKeys: Object.keys(req.body)
        });
        break;
      default:
        console.log(`Unhandled Airbyte job status: ${jobStatus}`);
    }

    if (streamStatuses && Array.isArray(streamStatuses)) {
      await handleStreamStatuses(streamStatuses);
    }

    res.status(200).json({
      success: true,
      message: 'Airbyte webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing Airbyte webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

async function handleSyncSuccess(data) {
  console.log('Sync completed successfully:', {
    connectionName: data.connectionName,
    recordsCommitted: data.recordsCommitted,
    bytesCommitted: data.bytesCommitted,
    duration: `${Math.round(data.duration / 1000)}s`
  });

  // Only send Slack notification if there were retries (indicates issues)
  if (data.attemptNumber && data.attemptNumber > 1) {
    await slackNotifier.sendAirbyteAlert({
      jobStatus: 'succeeded',
      connectionName: data.connectionName,
      connectionId: data.connectionId,
      jobId: data.jobId,
      attemptNumber: data.attemptNumber
    });
  }
}

async function handleSyncFailure(data) {
  console.error('Sync failed:', {
    connectionName: data.connectionName,
    jobId: data.jobId,
    attemptNumber: data.attemptNumber
  });

  // Always send Slack notification for failures
  await slackNotifier.sendAirbyteAlert({
    jobStatus: 'failed',
    connectionName: data.connectionName,
    connectionId: data.connectionId,
    jobId: data.jobId,
    attemptNumber: data.attemptNumber,
    error: data.error || 'Sync failed without specific error message'
  });
}

async function handleSyncRunning(data) {
  console.log('Sync in progress:', {
    connectionName: data.connectionName,
    recordsEmitted: data.recordsEmitted,
    bytesEmitted: data.bytesEmitted
  });
}

async function handleSyncCancelled(data) {
  console.log('Sync cancelled:', {
    connectionName: data.connectionName,
    jobId: data.jobId
  });

  // Send Slack notification for cancelled syncs (may indicate issues)
  await slackNotifier.sendAirbyteAlert({
    jobStatus: 'cancelled',
    connectionName: data.connectionName,
    connectionId: data.connectionId,
    jobId: data.jobId
  });
}

async function handleStreamStatuses(streamStatuses) {
  streamStatuses.forEach(stream => {
    console.log('Stream status:', {
      streamName: stream.streamName,
      status: stream.status,
      recordsEmitted: stream.recordsEmitted,
      recordsCommitted: stream.recordsCommitted
    });
  });
}

// Test endpoint for Slack notifications (remove in production)
const testSlackHandler = async (req, res) => {
  try {
    const testData = {
      jobStatus: 'failed',
      connectionName: 'Test Connection',
      connectionId: 'test-123',
      jobId: 'job-456',
      attemptNumber: 2,
      error: 'This is a test notification from Airbyte webhook handler'
    };

    const sent = await slackNotifier.sendAirbyteAlert(testData);

    res.json({
      success: sent,
      message: sent ? 'Test Slack notification sent' : 'Slack notifications disabled or failed',
      testData
    });
  } catch (error) {
    console.error('Test Slack notification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

router.get('/test-slack', testSlackHandler);
router.post('/test-slack', testSlackHandler);

module.exports = router;