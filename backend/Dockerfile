# ── Build stage ───────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3001

# Run migrations then start server
CMD ["sh", "-c", "node src/db/migrate.js && node src/server.js"]
