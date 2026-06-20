# Build stage
FROM oven/bun:1-alpine AS builder

ARG GHOST_CONTENT_API_URL=https://ghost.theor.net/ghost/api/content
ARG GHOST_CONTENT_API_KEY
ARG GHOST_ACTIVITYPUB_OUTBOX_URL=https://ghost.theor.net/.ghost/activitypub/outbox/index
ARG GHOST_STATS_ENDPOINT
ARG GHOST_STATS_SITE_API_URL=https://ghost.theor.net/ghost/api/admin/site/
ARG GHOST_STATS_SCRIPT_URL=https://ghost.theor.net/public/ghost-stats.min.js
ARG GHOST_STATS_DATASOURCE=analytics_events
ARG GHOST_CONTENT_CACHE_BUST=local

ENV GHOST_CONTENT_API_URL=$GHOST_CONTENT_API_URL
ENV GHOST_CONTENT_API_KEY=$GHOST_CONTENT_API_KEY
ENV GHOST_ACTIVITYPUB_OUTBOX_URL=$GHOST_ACTIVITYPUB_OUTBOX_URL
ENV GHOST_STATS_ENDPOINT=$GHOST_STATS_ENDPOINT
ENV GHOST_STATS_SITE_API_URL=$GHOST_STATS_SITE_API_URL
ENV GHOST_STATS_SCRIPT_URL=$GHOST_STATS_SCRIPT_URL
ENV GHOST_STATS_DATASOURCE=$GHOST_STATS_DATASOURCE

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the site. The cache-bust value ensures Ghost-triggered rebuilds refetch remote content.
RUN echo "$GHOST_CONTENT_CACHE_BUST" > /tmp/ghost-content-cache-bust && bun run build

# Production stage
FROM nginx:alpine AS production

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
