# Portainer Deployment Guide

## 🚀 Quick Deploy to Portainer

### Method 1: Deploy from GitHub Repository (Recommended)

1. **Log into Portainer**
   - Navigate to your Portainer instance
   - Go to **Stacks** → **Add stack**

2. **Create New Stack**
   - **Name**: `webhooks-docker`
   - **Build method**: Select **Repository**
   - **Repository URL**: `https://github.com/kc-rooted/webhooks-docker`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `docker-compose.yml`

3. **Environment Variables**
   Add these environment variables in Portainer:
   ```
   MONDAY_API_TOKEN=your_monday_api_token_here
   MONDAY_WEBHOOK_SECRET=your_webhook_secret_if_needed
   AIRBYTE_WEBHOOK_TOKEN=your_secure_airbyte_token
   NODE_ENV=production
   PORT=3000
   ```

4. **Deploy**
   - Click **Deploy the stack**
   - Wait for container to start

### Method 2: Copy/Paste Docker Compose

1. **Create Stack in Portainer**
   - Go to **Stacks** → **Add stack**
   - **Name**: `webhooks-docker`
   - **Build method**: Select **Web editor**

2. **Paste Docker Compose Content**
   Copy the contents from `docker-compose.porta
iner.yml` (see below)

3. **Set Environment Variables**
   In the environment variables section, add:
   ```
   MONDAY_API_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU2MjgzNTMxNywiYWFpIjoxMSwidWlkIjo5NDU5NjEwLCJpYWQiOiIyMDI1LTA5LTE2VDE4OjU2OjEwLjU1OVoiLCJwZXIiOiJtZTp3cml0ZSIsImFjdGlkIjo0Mjk5OTkwLCJyZ24iOiJ1c2UxIn0.aSM7tOXmQUN7GLVVn19gRH2SLFSmYDUH5RGxlfmB4s8
   AIRBYTE_WEBHOOK_TOKEN=your_secure_token_here
   NODE_ENV=production
   ```

4. **Deploy Stack**

## 🌐 Post-Deployment Steps

### 1. Verify Deployment
- Check container logs in Portainer
- Look for: `Webhook handler server running on port 3000`

### 2. Test Health Endpoint
```bash
curl https://your-domain.com/health
```

### 3. Configure Reverse Proxy (if needed)
If using Traefik or Nginx, the compose file includes labels for automatic setup.

### 4. Update Monday.com Webhooks
- Update webhook URLs from your ngrok URL to your production domain
- Example: `https://your-domain.com/webhooks/monday`

### 5. Configure Airbyte Webhooks
- Update Airbyte webhook URLs to production
- Example: `https://your-domain.com/webhooks/airbyte`

## 🔧 Troubleshooting

### Container Won't Start
1. Check environment variables are set
2. Review container logs in Portainer
3. Ensure port 3000 is available

### Webhooks Not Working
1. Test health endpoint first
2. Check webhook URLs are correct
3. Verify Monday API token is valid
4. Check Portainer logs for errors

### SSL/HTTPS Issues
1. Ensure reverse proxy is configured
2. Check domain DNS settings
3. Verify SSL certificates

## 📊 Monitoring

### Health Checks
The container includes health checks:
- `/health` - Basic health
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Logs
Monitor webhook activity in Portainer logs:
- Successful webhooks show processing details
- Errors are logged with stack traces
- All HTTP requests are logged with Morgan

## 🔄 Updates

### Update from GitHub
1. Go to your stack in Portainer
2. Click **Editor**
3. Click **Pull and redeploy**
4. Portainer will pull latest changes and redeploy

### Manual Update
1. Update the stack in Portainer
2. Change the image tag or environment variables
3. Click **Update the stack**

## 🔐 Security Notes

- Environment variables are stored securely in Portainer
- Never commit `.env` file with real credentials
- API tokens are isolated from the codebase
- Container runs as non-root user for security