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
COPY prisma ./prisma/

RUN npm install

# Development image
FROM base AS dev
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# Verwende db push statt migrate deploy (erstellt Tabellen direkt aus Schema)
CMD ["sh", "-c", "npx prisma generate --schema=/app/prisma/schema.prisma && npx prisma db push --schema=/app/prisma/schema.prisma --accept-data-loss && (npx prisma db seed || echo 'Seed skipped') && npm run dev"]
