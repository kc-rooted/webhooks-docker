FROM node:18-alpine AS base

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --production; fi

FROM base AS build
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .

FROM base AS runtime
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

CMD ["node", "src/index.js"]