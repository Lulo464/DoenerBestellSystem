# 🍖 Food Order System

Ein modernes und vollständiges Bestell- und Verwaltungssystem für Restaurants mit Next.js 14, PostgreSQL, Prisma und NextAuth. Optimiert für Döner- und Snack-Restaurants mit umfassender Admin-Verwaltung.

## ✨ Features

### Für Benutzer
- 🛒 **Warenkorb-System** mit Produktoptionen und Menüzusammenstellungen
- 📦 **Boxen/Menüs** - Vorkonfigurierte Produktpakete
- 🔐 **Sichere Authentifizierung** mit NextAuth, optionaler 2FA (TOTP) und **OIDC/SSO** (Keycloak, Authentik, Okta, etc.)
- 📋 **Bestellverwaltung** - Verfolgung von Bestellstatus
- 🎯 **Produktoptionen** - Flexible Anpassung (Fleisch, Soße, Extras, etc.)
- ⚙️ **Profilverwaltung** - Bearbeitung von Name, E-Mail und Passwort in den Einstellungen
- 🔔 **Benachrichtigungseinstellungen** - Kontrolle über E-Mail-Benachrichtigungen

### Für Administratoren
- 👥 **Benutzerverwaltung** mit rollenbasiertem Zugriff (RBAC)
- 📦 **Produktverwaltung** - Kategorien, Produkte, Preise und Optionen
- 💳 **Zahlungskontenverwaltung** - IBAN und PayPal Integration
- 📊 **Bestellungsverwaltung** - Statusverfolgung und Abrechnung
- 💰 **Preismanagement** - Flexible Preisgestaltung mit Aufpreisen
- ⚙️ **Systemeinstellungen** - Konfigurierbare App-Parameter

### Rollenbasierte Berechtigungen
- **Mitarbeiter** - Bestellen, Bestellstatus einsehen
- **Admin** - Alle Bestellungen sehen, Produkte verwalten
- **Hauptadmin** - Admin-Funktionen + Preise ändern, Zahlungskonten verwalten
- **Superadmin** - Vollzugriff inkl. Benutzerverwaltung

## 🛠️ Tech-Stack

### Frontend
- **Next.js 14.2** - React Framework mit SSR/SSG
- **React 18** - UI-Komponenten
- **Tailwind CSS 3** - Styling
- **TypeScript** - Typsicherheit

### Backend & Datenbank
- **Node.js 20** - Runtime
- **Prisma 5** - ORM für PostgreSQL
- **PostgreSQL 16** - Relationale Datenbank
- **NextAuth 4** - Authentifizierung & Sessions

### Weitere Libraries
- **nodemailer** - E-Mail-Versand
- **otplib** - TOTP 2FA
- **qrcode** - QR-Code-Generierung für Zahlungslinks
- **bcryptjs** - Passwort-Hashing
- **zod** - Validierung
- **clsx** - CSS-Klassenverwaltung

## 📋 Anforderungen

- **Node.js** >= 20.x
- **Docker & Docker Compose** (für Containerisierung, empfohlen)
- **PostgreSQL** 16+ (oder via Docker)
- **npm** oder **yarn**

## 🚀 Schnellstart

⚠️ **WICHTIG**: Lese die vollständige Anleitung in [SETUP.md](./SETUP.md) für ein problemloses Neuaufsetzen auf anderen Systemen!

### Option 1: Mit vorgefertigtem Image von Docker Hub (Schnellste Methode ⚡)

```bash
# Aktuelles Image pullen
docker pull lulo464/doener-app:latest

# Container mit Environment-Variablen starten
docker run -d \
  --name doener-app \
  -p 3000:3000 \
  -e SMTP_HOST="smtp.gmail.com" \
  -e SMTP_PORT="587" \
  -e SMTP_USER="deine-email@example.com" \
  -e SMTP_PASS="dein-app-passwort" \
  -e DATABASE_URL="postgresql://foodorder:foodorder@localhost:5432/foodorder" \
  lulo464/doener-app:latest

# App unter http://localhost:3000 verfügbar
```

> **Tipp**: Für einfacheres Setup mit PostgreSQL-Datenbank nutze Option 2 (Docker Compose)

### Option 2: Mit Docker Compose (Mit Datenbank)

```bash
# Repository klonen
git clone <repository-url>
cd DoenerDBV1

# Environment-Variablen konfigurieren
cp .env.example .env
# 🔥 WICHTIG: Bearbeite .env und trage SMTP-Daten ein!

# Container starten (nutzt lulo464/doener-app:latest)
docker-compose up -d

# App unter http://localhost:3000 verfügbar
```

### Option 3: Lokale Installation

```bash
# Dependencies installieren (erzeugt exakte Versionen via package-lock.json)
npm install

# Datenbank-Migrations durchführen
npx prisma db push

# Test-Daten laden
npx prisma db seed

# Entwicklungsserver starten
npm run dev
```

Die Anwendung läuft dann unter `http://localhost:3000`.

### ⚠️ Häufige Fehler beim Setup

1. **SMTP-Variablen fehlen**: `.env` muss SMTP-Variablen enthalten (siehe `.env.example`)
2. **Prisma-Versions-Konflikte**: `npm install` stellt sicher, dass alle exakte Versionen haben
3. **PostgreSQL nicht verfügbar**: Mit Docker läuft PostgreSQL automatisch, lokal musst du PostgreSQL 16+ selbst installieren

## 🔧 Konfiguration

### Environment Variables

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
# Datenbank
DATABASE_URL="postgresql://foodorder:foodorder123@localhost:5432/foodorder"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dein-super-geheimes-secret-mindestens-32-zeichen-lang"

# SMTP für E-Mail-Versand
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-password"
SMTP_FROM="noreply@example.com"

# App
APP_NAME="Food Order System"
```

**NEXTAUTH_SECRET generieren:**
```bash
openssl rand -base64 32
```

### OIDC/SSO-Authentifizierung (optional)

Du kannst Credentials-Login durch OIDC/SSO ersetzen (z.B. Keycloak, Authentik, Okta):

```env
# OIDC/SSO Konfiguration - wenn leer, wird Credentials-Login verwendet
OIDC_ISSUER="https://auth.beispiel.de/realms/myrealm"
OIDC_CLIENT_ID="doenerdb"
OIDC_CLIENT_SECRET="dein-client-secret"
OIDC_PROVIDER_NAME="SSO"                      # Button-Label (optional)
OIDC_SUPERADMIN_EMAIL="admin@firma.de"        # Diese E-Mail bekommt SUPER_ADMIN Rolle
```

**Wichtig bei OIDC:**
- Alle drei Parameter (`OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`) müssen gesetzt sein
- Credentials-Login wird **automatisch deaktiviert** wenn OIDC aktiv ist
- Neue OIDC-Nutzer werden beim ersten Login automatisch in der DB angelegt
- Die Email in `OIDC_SUPERADMIN_EMAIL` erhält automatisch die `SUPER_ADMIN` Rolle
- Alle anderen Benutzer starten als `EMPLOYEE` und können via Admin-Panel verwaltet werden

**Redirect URI beim OIDC-Provider registrieren:**
```
https://DEINE-DOMAIN.de/api/auth/callback/oidc
```

## 🐳 Docker

### Verfügbares Image auf Docker Hub

Die aktuelle Version ist auf **Docker Hub** verfügbar:
```
lulo464/doener-app:latest
```

**Direkt pullen:**
```bash
docker pull lulo464/doener-app:latest
```

### Projekt mit Docker Compose starten

```bash
# Services starten (nutzt automatisch lulo464/doener-app:latest)
docker-compose up -d

# Logs ansehen
docker-compose logs -f doener-app

# Services stoppen
docker-compose down
```

### Services
- **doener-app**: Next.js App auf Port 3000 (via `lulo464/doener-app:latest`)
- **doener-db**: PostgreSQL auf Port 5432

## 💾 Datenbank-Verwaltung

### Prisma Studio (GUI)
```bash
npm run db:studio
```
Öffnet eine web-basierte Datenbank-GUI unter `http://localhost:5555`.

### Datenbank-Commands
```bash
# Neue Migration erstellen
npm run db:migrate

# Schema mit Datenbank synchronisieren
npm run db:push

# Seed-Daten laden
npm run db:seed

# Prisma Client generieren
npm run db:generate
```

## 👤 Test-Accounts

Nach dem Seed sind folgende Test-Accounts verfügbar:

| Email | Passwort | Rolle |
|-------|----------|-------|
| superadmin@firma.de | password123 | Superadmin |
| hauptadmin@firma.de | password123 | Hauptadmin |
| admin@firma.de | password123 | Admin |
| max.mustermann@firma.de | password123 | Mitarbeiter |
| erika.musterfrau@firma.de | password123 | Mitarbeiter |

⚠️ **WICHTIG:** Passwörter in der Produktion ändern!

## 🧑‍💻 Development

### Entwicklungsserver
```bash
npm run dev
```
Öffnet die App unter `http://localhost:3000`

### Build für Produktion
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

## 🗄️ Datenbank-Schema

### Hauptentitäten
- **User** - Benutzer mit Rollen und 2FA
- **Product** - Produkte mit konfigurierbaren Optionen
- **Category** - Produktkategorien
- **Order** - Bestellungen mit Status-Tracking
- **OrderItem** - Bestellte Artikel
- **CartItem** - Artikel im Warenkorb
- **Box** - Menüzusammensetzungen
- **PaymentAccount** - Zahlungskonten (IBAN/PayPal)
- **SystemSettings** - App-Konfiguration

### Bestellungs-Status
```
PENDING         → Aufgegeben
CONFIRMED       → Bestätigt vom Admin
ON_THE_WAY      → Unterwegs
DELIVERED       → Abgeliefert
PAYMENT_PENDING → Zahlung ausstehend
COMPLETED       → Abgeschlossen und bezahlt
CANCELLED       → Storniert
```

## 📁 Projektstruktur

```
DoenerDB/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/           # Admin-Dashboard
│   │   ├── api/             # API Routes & Endpoints
│   │   ├── auth/            # Auth-Seiten
│   │   └── page.tsx         # Home Page
│   ├── components/          # React-Komponenten
│   ├── lib/
│   │   ├── auth.ts          # Auth-Konfiguration
│   │   ├── mailer.ts        # E-Mail-Versand
│   │   └── utils.ts         # Helper-Funktionen
│   ├── actions/             # Server Actions
│   └── styles/              # Globale Styles
├── prisma/
│   ├── schema.prisma        # Datenbank-Schema
│   └── seed.ts              # Seed-Script
├── public/                  # Statische Assets
├── docker-compose.yml       # Docker-Konfiguration
├── Dockerfile               # Multi-stage Docker Build
└── package.json             # Dependencies
```

## 📧 SMTP-Konfiguration

Die Anwendung versendet E-Mails via Nodemailer. Beispielkonfigurationen:

### Gmail
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"  # App-Passwort, nicht das normale!
SMTP_FROM="noreply@example.com"
```

### Office 365
```env
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-password"
SMTP_FROM="noreply@example.com"
```

### Eigenständiger Mail-Server
```env
SMTP_HOST="mail.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="mailuser"
SMTP_PASS="mailpassword"
SMTP_FROM="noreply@example.com"
```

## 🔐 Sicherheitshinweise

1. **Test-Konten**: Alle Test-Passwörter in Produktion ändern
2. **NEXTAUTH_SECRET**: Einen starken, zufälligen Secret verwenden
3. **Datenbank-Zugriff**: Nur über sichere Verbindungen (SSL/TLS)
4. **Credentials**: Niemals hart-codieren, nur via Environment Variables
5. **2FA aktivieren**: Für Admin-Accounts dringend empfohlen
6. **Backups**: Regelmäßige Datenbank-Backups einrichten
7. **Rate Limiting**: In Produktion implementieren (z.B. für Login)

## 🚢 Deployment

### Mit Docker Hub Image (empfohlen ⭐)

Das neueste Image ist bereits auf Docker Hub verfügbar:

```bash
# Einfach das vorgefertigte Image nutzen
docker pull lulo464/doener-app:latest

# Auf Server deployen
docker-compose up -d
```

Keine eigene Build notwendig - verwende einfach `lulo464/doener-app:latest` in deiner `docker-compose.yml`!

### Mit eigenem Docker Image

```bash
# Production Image bauen
docker build --target dev -t food-order:latest .

# Image pushen (zu Docker Registry)
docker push your-registry/food-order:latest

# Auf Server deployen
docker pull your-registry/food-order:latest
docker-compose up -d
```

### Standalone Server mit PM2

```bash
# PM2 installieren
npm install -g pm2

# App bauen
npm run build

# Mit PM2 starten
pm2 start npm --name "food-order" -- start
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

### Docker Logs prüfen
```bash
docker logs -f doener-app
docker logs -f doener-db
```

### Datenbank-Shell
```bash
docker-compose exec doener-db psql -U foodorder -d foodorder
```

### Prisma Debug-Modus
```bash
DEBUG=prisma:* npm run dev
```

### Volumen löschen und neubuild
```bash
docker-compose down -v
docker-compose up --build
```

## 📝 Lizenz

MIT License - Siehe LICENSE Datei für Details

## 🤝 Contributing

Contributions sind willkommen! Bitte:
1. Fork das Projekt
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Commit deine Changes (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## 📞 Support

Bei Fragen oder Problemen:
- Überprüfe die [Issues](https://github.com/yourusername/DoenerDB/issues)
- Erstelle einen neuen Issue mit Beschreibung und Steps zum Reproduzieren
- Kontaktiere das Entwickler-Team

---

**Viel Spaß mit dem Food Order System! 🍖**

Made with ❤️ für schnelle Bestellungen
