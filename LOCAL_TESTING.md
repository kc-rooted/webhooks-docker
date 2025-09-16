# Local Testing Guide

## 🚀 Quick Start

### 1. Start the Server

```bash
# Terminal 1 - Start the webhook server
npm run dev
```

The server will start on `http://localhost:3000`

### 2. Test the API Connection

```bash
# Terminal 2 - Test Monday.com API
node test-monday-api.js
```

This verifies your Monday.com API token is working and shows your boards/items.

### 3. Test Webhook Endpoints Locally

```bash
# Terminal 2 - Run webhook simulation tests
node test-webhooks.js
```

This sends test webhook payloads to your local server.

## 🌐 Testing with Real Monday.com Webhooks

To receive actual webhooks from Monday.com, you need to expose your local server to the internet using **ngrok**.

### Install ngrok

```bash
# macOS (using Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

### Setup ngrok

1. **Sign up for free account** at https://ngrok.com
2. **Get your auth token** from the dashboard
3. **Configure ngrok**:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

### Expose Your Local Server

```bash
# Terminal 3 - Start ngrok tunnel
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### Configure Monday.com Webhook

1. **Go to your Monday.com board**
2. **Click on Integrate** (top right)
3. **Search for "Webhooks"** and select it
4. **Configure the webhook**:
   - URL: `https://YOUR_NGROK_URL.ngrok.io/webhooks/monday`
   - Select events you want to listen to:
     - When an item is created
     - When any column changes
     - When a status changes
   - Click "Add to board"

5. **Test the webhook**:
   - Create a new item in your board
   - Change a status
   - You should see the webhook data in your terminal running `npm run dev`

## 🧪 Testing with curl

You can also test individual endpoints with curl:

### Health Check
```bash
curl http://localhost:3000/health
```

### Monday Webhook Test
```bash
curl -X POST http://localhost:3000/webhooks/monday \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "create_item",
      "boardId": 123456,
      "pulseId": 789,
      "pulseName": "Test Item"
    }
  }'
```

### Airbyte Webhook Test
```bash
curl -X POST http://localhost:3000/webhooks/airbyte \
  -H "Content-Type: application/json" \
  -H "X-Airbyte-Token: test-token" \
  -d '{
    "connectionId": "test-123",
    "connectionName": "Test Sync",
    "jobStatus": "succeeded",
    "recordsCommitted": 1000
  }'
```

## 📊 Monitoring Logs

When running with `npm run dev`, you'll see:

1. **Morgan HTTP logs** - Every request with status codes
2. **Console logs** - Webhook processing details
3. **Error logs** - Any issues during processing

Example output:
```
Webhook handler server running on port 3000
Environment: development
POST /webhooks/monday 200 15.234 ms
Monday.com webhook received: { eventType: 'create_item', boardId: 123456 }
Processing item creation: { itemId: 789, itemName: 'Test Item' }
```

## 🐳 Docker Testing

To test with Docker locally:

```bash
# Build the image
docker build -t webhook-handler:test .

# Run with your .env file
docker run -p 3000:3000 --env-file .env webhook-handler:test

# Or use docker-compose
docker-compose up
```

## ⚠️ Troubleshooting

### Server won't start
- Check if port 3000 is already in use: `lsof -i :3000`
- Kill the process: `kill -9 PID`

### Monday API errors
- Verify your API token in `.env` file
- Check token permissions at https://monday.com/developers/apps

### Webhooks not received
- Ensure ngrok is running and forwarding to port 3000
- Check the ngrok web interface: http://127.0.0.1:4040
- Verify webhook URL in Monday.com matches your ngrok URL

### ngrok connection issues
- Free tier has limits (40 connections/minute)
- URL changes each time you restart ngrok (unless you have a paid plan)
- Check ngrok status page: https://status.ngrok.com/

## 📝 Development Tips

1. **Use nodemon** - The server auto-restarts on file changes when using `npm run dev`

2. **Check ngrok inspector** - Visit http://127.0.0.1:4040 to see all requests/responses through ngrok

3. **Test incrementally** - Start with health checks, then local webhook tests, then real webhooks

4. **Keep logs clean** - Set `LOG_LEVEL=debug` in `.env` for more verbose logging when debugging

5. **Save test payloads** - When you receive a real webhook, save the payload for future testing