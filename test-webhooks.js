const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

function sendWebhook(path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`\n✅ Response from ${path}:`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Body: ${responseData}`);
        resolve({ status: res.statusCode, body: responseData });
      });
    });

    req.on('error', (error) => {
      console.error(`\n❌ Error sending to ${path}:`, error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testMondayWebhooks() {
  console.log('\n🔔 Testing Monday.com Webhooks\n');
  console.log('================================\n');

  // Test 1: Challenge verification
  console.log('1️⃣  Testing challenge verification...');
  await sendWebhook('/webhooks/monday', {
    challenge: 'test-challenge-123'
  });

  // Test 2: Item created event
  console.log('\n2️⃣  Testing item created event...');
  await sendWebhook('/webhooks/monday', {
    event: {
      type: 'create_item',
      userId: 12345,
      boardId: 987654321,
      pulseId: 111111,
      pulseName: 'New Task Created',
      groupId: 'group_1',
      timestamp: Date.now()
    }
  });

  // Test 3: Status change event
  console.log('\n3️⃣  Testing status change event...');
  await sendWebhook('/webhooks/monday', {
    event: {
      type: 'change_status_column_value',
      userId: 12345,
      boardId: 987654321,
      pulseId: 111111,
      columnId: 'status',
      value: { label: 'Done' },
      previousValue: { label: 'Working on it' },
      timestamp: Date.now()
    }
  });

  // Test 4: Column value update
  console.log('\n4️⃣  Testing column value update...');
  await sendWebhook('/webhooks/monday', {
    event: {
      type: 'update_column_value',
      userId: 12345,
      boardId: 987654321,
      pulseId: 111111,
      columnId: 'text_column',
      value: 'Updated text value',
      timestamp: Date.now()
    }
  });
}

async function testAirbyteWebhooks() {
  console.log('\n\n📊 Testing Airbyte Webhooks\n');
  console.log('================================\n');

  // Test 1: Sync success
  console.log('1️⃣  Testing sync success event...');
  await sendWebhook('/webhooks/airbyte', {
    connectionId: 'conn_123',
    connectionName: 'MySQL to Postgres Sync',
    jobId: 'job_456',
    jobStatus: 'succeeded',
    attemptNumber: 1,
    recordsEmitted: 1000,
    recordsCommitted: 1000,
    bytesEmitted: 102400,
    bytesCommitted: 102400,
    startTime: Date.now() - 60000,
    endTime: Date.now(),
    streamStatuses: [
      {
        streamName: 'users',
        status: 'complete',
        recordsEmitted: 500,
        recordsCommitted: 500
      },
      {
        streamName: 'orders',
        status: 'complete',
        recordsEmitted: 500,
        recordsCommitted: 500
      }
    ]
  }, {
    'X-Airbyte-Token': process.env.AIRBYTE_WEBHOOK_TOKEN || 'test-token'
  });

  // Test 2: Sync failure
  console.log('\n2️⃣  Testing sync failure event...');
  await sendWebhook('/webhooks/airbyte', {
    connectionId: 'conn_123',
    connectionName: 'MySQL to Postgres Sync',
    jobId: 'job_789',
    jobStatus: 'failed',
    attemptNumber: 3,
    startTime: Date.now() - 120000,
    endTime: Date.now(),
    error: 'Connection timeout'
  }, {
    'X-Airbyte-Token': process.env.AIRBYTE_WEBHOOK_TOKEN || 'test-token'
  });

  // Test 3: Sync running
  console.log('\n3️⃣  Testing sync running event...');
  await sendWebhook('/webhooks/airbyte', {
    connectionId: 'conn_123',
    connectionName: 'MySQL to Postgres Sync',
    jobId: 'job_999',
    jobStatus: 'running',
    attemptNumber: 1,
    recordsEmitted: 250,
    bytesEmitted: 25600,
    startTime: Date.now() - 30000
  }, {
    'X-Airbyte-Token': process.env.AIRBYTE_WEBHOOK_TOKEN || 'test-token'
  });
}

async function testHealthEndpoints() {
  console.log('\n\n🏥 Testing Health Endpoints\n');
  console.log('================================\n');

  const endpoints = ['/health', '/health/ready', '/health/live'];

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);

    const options = {
      hostname: HOST,
      port: PORT,
      path: endpoint,
      method: 'GET'
    };

    await new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${data}\n`);
          resolve();
        });
      });
      req.on('error', (error) => {
        console.error(`   Error: ${error.message}\n`);
        resolve();
      });
      req.end();
    });
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Webhook Tests');
  console.log('   Server: http://' + HOST + ':' + PORT);
  console.log('\n   Make sure your server is running with: npm run dev\n');

  try {
    await testHealthEndpoints();
    await testMondayWebhooks();
    await testAirbyteWebhooks();

    console.log('\n\n✨ All tests completed!\n');
  } catch (error) {
    console.error('\n\n❌ Test suite failed:', error.message);
    console.error('\n   Make sure the server is running on port', PORT);
  }
}

// Run tests
runAllTests();