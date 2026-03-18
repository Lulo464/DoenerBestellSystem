#!/bin/sh
set -e

echo "========== DoenerDB Configuration =========="

# Check OIDC configuration
if [ -n "$OIDC_ISSUER" ] && [ -n "$OIDC_CLIENT_ID" ] && [ -n "$OIDC_CLIENT_SECRET" ]; then
  echo "✓ OIDC/SSO: ENABLED"
  echo "  Issuer: $OIDC_ISSUER"
  echo "  Provider: ${OIDC_PROVIDER_NAME:-SSO (default)}"
  if [ -n "$OIDC_SUPERADMIN_EMAIL" ]; then
    echo "  Superadmin: $OIDC_SUPERADMIN_EMAIL"
  fi
else
  echo "✗ OIDC/SSO: DISABLED (using Credentials login)"
fi

echo "=========================================="
echo ""

# Run database migrations
echo "Setting up database..."
npx prisma generate --schema=/app/prisma/schema.prisma
npx prisma db push --schema=/app/prisma/schema.prisma --accept-data-loss

# Run seed script (optional)
npx prisma db seed || echo "Seed skipped"

echo ""
echo "Starting application..."
npm run dev
