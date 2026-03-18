# 🚀 Setup auf neuem System - Schritt für Schritt

Dieses Dokument beschreibt, wie du das Projekt auf einem **neuen/anderen System** aufsetzen kannst.

## ⚠️ Wichtige Voraussetzungen

- **Node.js**: Version >= 20.x
- **Docker & Docker Compose**: Für einfaches Setup (empfohlen)
- **npm** oder **yarn**
- **Git**

Überprüfe deine Versionen:
```bash
node --version    # sollte >= 20.x sein
docker --version
npm --version
```

## 📋 Schnellstart mit Docker (Empfohlen)

### 1. Repository klonen
```bash
git clone <repository-url>
cd DoenerDBV1
```

### 2. Environment-Variablen konfigurieren
```bash
cp .env.example .env
```

**WICHTIG**: Bearbeite die `.env` Datei und fülle folgende Variablen aus:

```env
# SMTP für E-Mail-Versand - ERFORDERLICH für Docker!
SMTP_HOST="smtp.gmail.com"      # oder dein Mail-Server
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="deine-email@example.com"
SMTP_PASS="dein-app-passwort"
SMTP_FROM="noreply@firma.de"

# Für Production: NEXTAUTH_SECRET generieren
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

**Hinweis**: Ohne SMTP-Konfiguration wird Docker-Compose mit Fehlern starten!

**Optional - OIDC/SSO Login:**
Falls du statt Credentials-Login ein SSO-System verwenden möchtest (Keycloak, Authentik, Okta, etc.), ergänze in `.env`:

```env
OIDC_ISSUER="https://auth.beispiel.de/realms/myrealm"
OIDC_CLIENT_ID="doenerdb"
OIDC_CLIENT_SECRET="dein-secret"
OIDC_SUPERADMIN_EMAIL="admin@firma.de"
```

Alle drei Parameter müssen gesetzt sein, damit OIDC aktiviert wird. Siehe [OIDC-Setup](#oidc-setup-anleitung) für Details.

### 3. Docker starten
```bash
docker-compose up -d
```

Die App ist dann verfügbar unter: **http://localhost:3000**

### 4. Datenbank überprüfen
```bash
# Logs anschauen
docker-compose logs -f doener-app

# Datenbank ist bereit, wenn diese Nachricht erscheint:
# "🎉 Seeding completed!"
```

### 5. Anmelden
Nutze einen dieser Test-Accounts (Passwort: `password123`):
- **superadmin@firma.de** - Vollzugriff
- **admin@firma.de** - Admin-Funktionen
- **max.mustermann@firma.de** - Mitarbeiter

## 🛠️ Setup ohne Docker (Lokal)

Falls du Docker nicht verwenden möchtest:

### 1. Dependencies installieren
```bash
npm install
```

Das erzeugt automatisch die `package-lock.json` und installiert **exakte Versionen**, die auf allen Systemen gleich sind.

### 2. Environment-Variablen
```bash
cp .env.example .env
# Bearbeite .env und passe DATABASE_URL und SMTP an
```

Für lokale Entwicklung mit PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/foodorder"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-min-32-chars-long-here"
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 3. Datenbank initialisieren
```bash
npx prisma db push      # Erstellt Tabellen
npx prisma db seed      # Lädt Test-Daten
```

### 4. Entwicklungsserver starten
```bash
npm run dev
```

App verfügbar unter: http://localhost:3000

## 🐛 Troubleshooting

### Problem: "SMTP-Variablen fehlen" in Docker
**Ursache**: `.env` Datei nicht korrekt gefüllt
**Lösung**:
```bash
# Überprüfe die .env Datei
cat .env | grep SMTP

# Alle SMTP-Variablen müssen gesetzt sein:
echo $SMTP_HOST $SMTP_PORT $SMTP_USER $SMTP_PASS $SMTP_FROM
```

### Problem: "Prisma Update verfügbar" Warnung
**Ursache**: Keine `package-lock.json` im Repo → verschiedene npm-Versionen
**Lösung**:
```bash
# Mit Docker: Dockerfile erzeugt Lock-Datei automatisch
docker-compose down -v
docker-compose up --build -d

# Lokal: Lock-Datei generieren
rm -rf node_modules
npm install
```

Der **Dockerfile** nutzt automatisch `npm ci` (mit Lock-Datei) oder `npm install` (erzeugt Lock-Datei).
Das stellt sicher, dass alle Systeme die **exakt gleichen Versionen** bekommen.

### Problem: PostgreSQL Connection Error
**Auf Docker**:
```bash
# Warte bis PostgreSQL ready ist
docker-compose logs doener-db

# Datenbank manuell neu bauen
docker-compose down -v
docker-compose up --build -d
```

**Lokal**:
```bash
# Überprüfe PostgreSQL läuft
psql -U foodorder -d foodorder -h localhost

# Falls nicht installiert: Install PostgreSQL 16+
# https://www.postgresql.org/download/
```

### Problem: "Port 3000 bereits in use"
```bash
# Finde Process auf Port 3000
lsof -i :3000
# oder Windows: netstat -ano | findstr :3000

# Oder nutze anderen Port in .env
NEXTAUTH_URL="http://localhost:3001"
# Dann starte mit: npm run dev -- -p 3001
```

### Problem: Permission Denied (Linux/Mac)
```bash
# Mache Seed-Script ausführbar
chmod +x prisma/seed.ts

# oder nutze ts-node direkt
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

## 🔄 Regelmäßige Wartung

### Datenbank-Backups (Docker)
```bash
docker-compose exec doener-db pg_dump -U foodorder foodorder > backup.sql
```

### Dependencies aktualisieren
```bash
npm update
npm audit fix
```

### Prisma Schema ändern
```bash
# Neue Migration erstellen
npx prisma migrate dev --name beschreibung_der_anderung

# Oder Schema direkt pushen (Dev)
npx prisma db push
```

## 🔐 OIDC-Setup-Anleitung

Falls du statt dem Standard-Credentials-Login (Email + Passwort) ein **SSO-System** verwenden möchtest:

### Unterstützte OIDC-Provider
- ✅ **Keycloak** - Open-Source Identity Server
- ✅ **Authentik** - Modern open-source identity provider
- ✅ **Okta** - Enterprise identity platform
- ✅ **Microsoft Entra ID (Azure AD)**
- ✅ Jeder andere OIDC-kompatible Provider

### 1. OIDC-Provider konfigurieren

Beispiel für **Keycloak**:

1. Öffne deine Keycloak Admin-Konsole
2. Navigiere zu: **Realm** → **Clients** → **Create**
3. Gib `doenerdb` als Client ID ein
4. Unter **Redirect URIs** füge hinzu:
   ```
   http://localhost:3000/api/auth/callback/oidc  (für Entwicklung)
   https://DEINE-DOMAIN.de/api/auth/callback/oidc (für Production)
   ```
5. Speichern und **Client Secret** kopieren
6. Gehe zu **Realm Settings** → **General** und kopiere die **Issuer-URL** (z.B. `https://auth.beispiel.de/realms/myrealm`)

### 2. .env konfigurieren

```env
# Credentials-Login deaktivieren, OIDC aktivieren:
OIDC_ISSUER="https://auth.beispiel.de/realms/myrealm"
OIDC_CLIENT_ID="doenerdb"
OIDC_CLIENT_SECRET="<secret-aus-step-1>"

# Optional:
OIDC_PROVIDER_NAME="Company SSO"              # Button-Label
OIDC_SUPERADMIN_EMAIL="admin@firma.de"        # Auto-Superadmin
```

**WICHTIG**: Wenn alle drei Variablen gesetzt sind, wird der **Credentials-Login komplett deaktiviert**!

### 3. Testen

```bash
docker-compose down
docker-compose up --build
```

Beim Start solltest du sehen:
```
========== DoenerDB Configuration ==========
✓ OIDC/SSO: ENABLED
  Issuer: https://auth.beispiel.de/realms/myrealm
  Provider: Company SSO
  Superadmin: admin@firma.de
==========================================
```

### 4. Workflow

1. **Login-Seite** zeigt nur "Mit SSO anmelden"-Button
2. User klickt Button → Redirect zu OIDC-Provider
3. **Erstes Login**: User wird automatisch in DB angelegt
   - Email = `OIDC_SUPERADMIN_EMAIL` → Rolle: `SUPER_ADMIN`
   - Andere Email → Rolle: `EMPLOYEE`
4. **Weitere Logins**: Bestehender User wird aktualisiert
5. **Rollen verwalten**: Admin-Panel wie gewohnt verwenden

### Troubleshooting OIDC

**Error: "expected 200 OK, got: 404 Not Found"**
- Issuer-URL ist falsch oder nicht erreichbar
- Überprüfe: `OIDC_ISSUER` muss auf `/.well-known/openid-configuration` enden
- Von Docker aus erreichbar? Nutze externe URLs, nicht localhost!

**Error: "invalid_client"**
- Client ID oder Secret falsch
- Redirect URI nicht registriert beim Provider

**Users werden nicht erstellt**
- Überprüfe DB-Logs: `docker-compose logs doener-db`
- Email im Token korrekt formatiert?

### Zurück zu Credentials-Login

Einfach die OIDC-Variablen löschen/leeren:
```env
OIDC_ISSUER=""
OIDC_CLIENT_ID=""
OIDC_CLIENT_SECRET=""
```

Dann `docker compose restart` und Login funktioniert wieder normal.

---

## 📚 Weitere Ressourcen

- [Prisma Dokumentation](https://www.prisma.io/docs/)
- [Next.js Dokumentation](https://nextjs.org/docs)
- [PostgreSQL 16 Docs](https://www.postgresql.org/docs/16/)
- [NextAuth.js Dokumentation](https://next-auth.js.org/)
- [OpenID Connect](https://openid.net/connect/)

## ❓ Noch Fragen?

Wenn etwas nicht funktioniert:
1. Überprüfe die **Docker Logs**: `docker-compose logs doener-app`
2. Kontrolliere die **.env Datei**: Alle erforderlichen Variablen gesetzt?
3. Lösche alles und starte neu: `docker-compose down -v && docker-compose up --build -d`
4. Bei OIDC: Ist die Issuer-URL extern erreichbar?

---

**Made with ❤️ für problemloses Setup**
