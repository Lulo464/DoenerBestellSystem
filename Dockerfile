FROM node:20-slim AS base

# Benötigte Pakete installieren
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dependencies installieren
FROM base AS deps
WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./
COPY prisma ./prisma/

# Generiere package-lock.json wenn nicht vorhanden, dann installiere
RUN npm ci --prefer-offline --no-audit || npm install

# Development image
FROM base AS dev
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Use entrypoint script to show configuration and start app
ENTRYPOINT ["/app/docker-entrypoint.sh"]
