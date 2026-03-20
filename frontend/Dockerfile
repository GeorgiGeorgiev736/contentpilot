# ── Build stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_URL="" means same-origin (nginx proxies /api); override for local dev
ARG VITE_API_URL=""
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env
RUN npm run build

# ── Serve stage ────────────────────────────────────────────────
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html

# Serve React app — API calls go directly to VITE_API_URL (external backend)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
