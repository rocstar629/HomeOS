# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

# --- Build Stage ---
FROM base AS builder

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Production Stage ---
FROM base AS runner

ENV NODE_ENV=production

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Runtime-writable directory for the in-app Settings screen
# (data/ha-config.json — Home Assistant URL/token entered after deploy).
# Mount a volume here so credentials survive container recreation.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# HOME_ASSISTANT_URL / HOME_ASSISTANT_TOKEN may be provided at runtime instead
# of using the in-app Settings screen. Never bake credentials into the image.
CMD ["node", "server.js"]
