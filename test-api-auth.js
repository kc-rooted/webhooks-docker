require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const API_KEY = process.env.API_KEY || 'test-api-key-123';

async function testAuth() {
  console.log('Testing API Key Authentication\n');
  console.log(`Using API_KEY: ${API_KEY}\n`);

  const tests = [
    {
      name: 'Health check (no auth required)',
      url: `${BASE_URL}/health`,
      expectedStatus: 200
    },
    {
      name: 'Monday webhook without API key',
      url: `${BASE_URL}/webhooks/monday`,
      method: 'POST',
      expectedStatus: 401
    },
    {
      name: 'Monday webhook with invalid API key',
      url: `${BASE_URL}/webhooks/monday?api_key=wrong-key`,
      method: 'POST',
      expectedStatus: 401
    },
    {
      name: 'Monday webhook with valid API key',
      url: `${BASE_URL}/webhooks/monday?api_key=${API_KEY}`,
      method: 'POST',
      headers: {
        'x-monday-signature': 'test'
      },
      data: { challenge: 'test-challenge' },
      expectedStatus: 200
    },
    {
      name: 'Airbyte webhook without API key',
      url: `${BASE_URL}/webhooks/airbyte`,
      method: 'POST',
      expectedStatus: 401
    },
    {
      name: 'Airbyte webhook with valid API key',
      url: `${BASE_URL}/webhooks/airbyte?api_key=${API_KEY}`,
      method: 'POST',
      headers: {
        'authorization': 'Bearer test-token'
      },
      data: { test: 'data' },
      expectedStatus: 200
    }
  ];

  for (const test of tests) {
    try {
      const config = {
        method: test.method || 'GET',
        url: test.url,
        headers: test.headers || {},
        data: test.data || {},
        validateStatus: () => true
      };

      const response = await axios(config);
      const passed = response.status === test.expectedStatus;

      console.log(`${passed ? '✅' : '❌'} ${test.name}`);
      console.log(`   Expected: ${test.expectedStatus}, Got: ${response.status}`);
      if (!passed) {
        console.log(`   Response: ${JSON.stringify(response.data)}`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

testAuth().catch(console.error);