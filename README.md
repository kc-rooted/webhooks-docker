# Webhook Handler Service

Node.js service for handling webhooks from Monday.com and Airbyte, containerized for deployment with Portainer.

## Features

- ✅ Express.js server with webhook endpoints
- ✅ Monday.com webhook handler with signature verification
- ✅ Airbyte webhook handler with token authentication
- ✅ Health check endpoints for monitoring
- ✅ Docker containerization with multi-stage build
- ✅ Production-ready with security headers (Helmet)
- ✅ Request logging with Morgan
- ✅ Environment-based configuration

## Project Structure

```
webhooks-docker/
├── src/
│   ├── index.js                 # Main server file
│   ├── handlers/
│   │   ├── monday.js            # Monday.com webhook handler
│   │   ├── airbyte.js           # Airbyte webhook handler
│   │   └── health.js            # Health check endpoints
│   └── middleware/
│       ├── errorHandler.js      # Global error handling
│       └── validation.js        # Webhook validation middleware
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml           # Docker Compose configuration
├── docker-compose.prod.yml      # Production overrides
├── package.json                 # Node dependencies
└── .env.example                 # Environment variables template
```

## Setup

### 1. Install Dependencies (for local development)

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `MONDAY_WEBHOOK_SECRET` - Secret from Monday.com app settings
- `AIRBYTE_WEBHOOK_TOKEN` - Custom token for Airbyte authentication

### 3. Run Locally

```bash
# Development with auto-reload
npm run dev

# Production mode
npm start
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Build the image
docker-compose build

# Run the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Deploy to Portainer

1. **Build the image locally:**
   ```bash
   docker build -t webhook-handler:latest .
   ```

2. **Push to your registry (optional):**
   ```bash
   docker tag webhook-handler:latest your-registry/webhook-handler:latest
   docker push your-registry/webhook-handler:latest
   ```

3. **In Portainer:**
   - Create a new stack
   - Paste the `docker-compose.yml` content
   - Add environment variables in Portainer's environment section
   - Deploy the stack

## API Endpoints

### Webhooks

- `POST /webhooks/monday` - Monday.com webhook endpoint
- `POST /webhooks/airbyte` - Airbyte webhook endpoint

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Root

- `GET /` - Service information

## Webhook Configuration

### Monday.com

1. In your Monday.com app settings, set the webhook URL to:
   ```
   https://your-domain.com/webhooks/monday
   ```

2. Copy the signing secret and add it to your `.env` as `MONDAY_WEBHOOK_SECRET`

### Airbyte

1. In Airbyte webhook configuration, set the URL to:
   ```
   https://your-domain.com/webhooks/airbyte
   ```

2. Add a custom token header:
   - Header name: `X-Airbyte-Token` or `Authorization: Bearer <token>`
   - Token value: Your `AIRBYTE_WEBHOOK_TOKEN`

## Security Features

- HMAC signature verification for Monday.com webhooks
- Token authentication for Airbyte webhooks
- Helmet.js for security headers
- CORS configuration
- Request size limits
- Environment-based secrets management

## Monitoring

The service includes health check endpoints compatible with:
- Docker health checks
- Kubernetes probes
- Load balancer health checks
- Uptime monitoring services

## Production Considerations

1. **SSL/TLS**: Use a reverse proxy (Nginx, Traefik) for HTTPS
2. **Rate Limiting**: Consider adding rate limiting for production
3. **Logging**: Configure centralized logging (ELK, CloudWatch, etc.)
4. **Monitoring**: Set up alerts for webhook failures
5. **Backup**: Implement webhook retry logic if needed
6. **Scaling**: Use docker-compose.prod.yml for replica configuration

## Development

```bash
# Run with nodemon for auto-reload
npm run dev

# Build Docker image
docker build -t webhook-handler:dev .

# Run with docker-compose override for development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs webhook-handler`
- Verify environment variables are set
- Ensure port 3000 is not in use

### Webhooks not being received
- Verify the webhook URLs are correct
- Check authentication credentials
- Review container logs for errors
- Test health endpoint: `curl http://localhost:3000/health`

### Monday.com signature validation failing
- Ensure `MONDAY_WEBHOOK_SECRET` matches the one in Monday.com
- Check that the request body is not modified by proxies

## License

ISC