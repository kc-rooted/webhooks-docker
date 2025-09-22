const { IncomingWebhook } = require('@slack/webhook');

class SlackNotifier {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = process.env.SLACK_NOTIFICATIONS_ENABLED === 'true';
    this.channel = process.env.SLACK_CHANNEL || '#data-alerts';

    if (this.enabled && this.webhookUrl) {
      this.webhook = new IncomingWebhook(this.webhookUrl);
      console.log('Slack notifications enabled');
    } else {
      console.log('Slack notifications disabled or webhook URL not configured');
    }
  }

  async send(message) {
    if (!this.enabled || !this.webhook) {
      console.log('Slack notification (disabled):', message);
      return false;
    }

    try {
      await this.webhook.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error.message);
      return false;
    }
  }

  async sendAirbyteAlert(data) {
    const { jobStatus, connectionName, connectionId, jobId, error, attemptNumber } = data;

    let color = 'warning';
    let title = 'Airbyte Sync Alert';
    let emoji = '⚠️';

    if (jobStatus === 'failed') {
      color = 'danger';
      title = 'Airbyte Sync Failed';
      emoji = '❌';
    } else if (jobStatus === 'cancelled') {
      color = 'warning';
      title = 'Airbyte Sync Cancelled';
      emoji = '🚫';
    } else if (jobStatus === 'succeeded' && attemptNumber > 1) {
      color = 'warning';
      title = 'Airbyte Sync Succeeded (After Retries)';
      emoji = '⚠️';
    }

    const message = {
      channel: this.channel,
      attachments: [
        {
          color,
          title: `${emoji} ${title}`,
          fields: [
            {
              title: 'Connection',
              value: connectionName || 'Unknown',
              short: true
            },
            {
              title: 'Status',
              value: jobStatus,
              short: true
            },
            {
              title: 'Connection ID',
              value: connectionId,
              short: true
            },
            {
              title: 'Job ID',
              value: jobId,
              short: true
            }
          ],
          footer: 'Airbyte Webhook Handler',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    // Add attempt number if retries occurred
    if (attemptNumber && attemptNumber > 1) {
      message.attachments[0].fields.push({
        title: 'Attempt Number',
        value: attemptNumber,
        short: true
      });
    }

    // Add error message if provided
    if (error) {
      message.attachments[0].fields.push({
        title: 'Error',
        value: error,
        short: false
      });
    }

    // Add action buttons for Airbyte Cloud if URL is configured
    if (process.env.AIRBYTE_CLOUD_URL) {
      const connectionUrl = `${process.env.AIRBYTE_CLOUD_URL}/connections/${connectionId}`;
      const jobUrl = `${process.env.AIRBYTE_CLOUD_URL}/connections/${connectionId}/job/${jobId}`;

      message.attachments[0].actions = [
        {
          type: 'button',
          text: 'View Connection',
          url: connectionUrl
        },
        {
          type: 'button',
          text: 'View Job Details',
          url: jobUrl
        }
      ];
    }

    return await this.send(message);
  }

  async sendSyncSummary(data) {
    const {
      connectionName,
      recordsCommitted,
      bytesCommitted,
      duration,
      streamStatuses
    } = data;

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    };

    const message = {
      channel: this.channel,
      attachments: [
        {
          color: 'good',
          title: '✅ Airbyte Sync Completed',
          fields: [
            {
              title: 'Connection',
              value: connectionName,
              short: true
            },
            {
              title: 'Duration',
              value: formatDuration(duration),
              short: true
            },
            {
              title: 'Records Synced',
              value: recordsCommitted?.toLocaleString() || '0',
              short: true
            },
            {
              title: 'Data Transferred',
              value: formatBytes(bytesCommitted || 0),
              short: true
            }
          ],
          footer: 'Airbyte Webhook Handler',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    // Add stream details if available
    if (streamStatuses && streamStatuses.length > 0) {
      const streamSummary = streamStatuses
        .filter(s => s.recordsCommitted > 0)
        .map(s => `• ${s.streamName}: ${s.recordsCommitted.toLocaleString()} records`)
        .join('\n');

      if (streamSummary) {
        message.attachments[0].fields.push({
          title: 'Streams Updated',
          value: streamSummary,
          short: false
        });
      }
    }

    return await this.send(message);
  }
}

// Create singleton instance
const slackNotifier = new SlackNotifier();

module.exports = slackNotifier;