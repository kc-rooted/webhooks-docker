const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const {
      connectionId,
      connectionName,
      jobId,
      jobStatus,
      attemptNumber,
      recordsEmitted,
      recordsCommitted,
      bytesEmitted,
      bytesCommitted,
      startTime,
      endTime,
      streamStatuses
    } = req.body;

    console.log('Airbyte webhook received:', {
      connectionId,
      connectionName,
      jobId,
      jobStatus,
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
          duration: endTime - startTime
        });
        break;
      case 'failed':
        await handleSyncFailure({
          connectionId,
          connectionName,
          jobId,
          attemptNumber
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
}

async function handleSyncFailure(data) {
  console.error('Sync failed:', {
    connectionName: data.connectionName,
    jobId: data.jobId,
    attemptNumber: data.attemptNumber
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

module.exports = router;