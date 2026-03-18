# ✅ Setup-Checklist für neues System

Verwende diese Checklist um sicherzustellen, dass das Projekt auf einem neuen System **ohne Fehler** läuft.

## Schritt 1: Vorbereitungen ✓

- [ ] Node.js >= 20.x installiert: `node --version`
- [ ] npm verfügbar: `npm --version`
- [ ] Docker & Docker Compose verfügbar: `docker --version`
- [ ] Git verfügbar: `git --version`
- [ ] Repository geklont: `git clone <url>`

## Schritt 2: Environment-Variablen ✓

- [ ] `.env.example` zu `.env` kopiert: `cp .env.example .env`
- [ ] `.env` in Editor geöffnet und überprüft
- [ ] Diese Variablen in `.env` gesetzt:
  - [ ] `DATABASE_URL` (korrekt für dein System)
  - [ ] `NEXTAUTH_URL` (lokal: `http://localhost:3000`)
  - [ ] `NEXTAUTH_SECRET` (generiert: `openssl rand -base64 32`)
- [ ] **SMTP_HOST** (z.B. `smtp.gmail.com`)
  - [ ] **SMTP_PORT** (z.B. `587`)
  - [ ] **SMTP_USER** (deine E-Mail)
  - [ ] **SMTP_PASS** (dein App-Passwort, nicht Passwort!)
  - [ ] **SMTP_FROM** (z.B. `noreply@firma.de`)
  - [ ] `APP_NAME` (z.B. `Internes Bestellsystem`)

**⚠️ OHNE diese Variablen wird Docker-Compose Fehler werfen!**

**Optional - OIDC/SSO statt Credentials-Login:**
- [ ] `OIDC_ISSUER` (z.B. `https://auth.beispiel.de/realms/myrealm`)
- [ ] `OIDC_CLIENT_ID` (z.B. `doenerdb`)
- [ ] `OIDC_CLIENT_SECRET` (vom OIDC-Provider)
- [ ] `OIDC_SUPERADMIN_EMAIL` (diese E-Mail bekommt SUPER_ADMIN)
- [ ] Redirect URI beim OIDC-Provider registriert: `https://DEINE-DOMAIN.de/api/auth/callback/oidc`

**Hinweis**: Wenn alle drei OIDC-Variablen gesetzt sind, wird Credentials-Login deaktiviert!

## Schritt 3: Docker Setup (Option A) ✓

Falls du Docker verwendest:

```bash
# 1. Starten
docker-compose up -d

# 2. Warten bis fertig (ca. 30-60 Sekunden)
docker-compose logs -f doener-app

# 3. Überprüfen - diese Meldung sollte erscheinen:
# "🎉 Seeding completed!"

# 4. Browser öffnen
# http://localhost:3000
```

- [ ] `docker-compose up -d` erfolgreich
- [ ] Logs zeigen keine Fehler
- [ ] App läuft auf http://localhost:3000
- [ ] Seed-Daten sind geladen
- [ ] Anmelden mit Test-Account möglich

## Schritt 4: Lokales Setup (Option B) ✓

Falls du OHNE Docker arbeiten möchtest:

```bash
# 1. Dependencies installieren (WICHTIG!)
npm install

# 2. Datenbank initialisieren
npx prisma db push

# 3. Test-Daten laden
npx prisma db seed

# 4. Dev-Server starten
npm run dev
```

Vorbedingungen:
- [ ] PostgreSQL 16+ ist installiert und läuft
- [ ] PostgreSQL-Verbindung: `DATABASE_URL` passt

Überprüfung:
- [ ] `npm install` abgeschlossen (keine Fehler)
- [ ] `prisma db push` erfolgreich
- [ ] `prisma db seed` zeigt "🎉 Seeding completed!"
- [ ] `npm run dev` läuft ohne Fehler
- [ ] App verfügbar unter http://localhost:3000

## Schritt 5: Test-Accounts ✓

- [ ] Anmelden mit: `superadmin@firma.de` / `password123`
- [ ] Produktkatalog ist sichtbar
- [ ] Admin-Dashboard verfügbar (rechts oben Menü)
- [ ] Kann sich abmelden

## Schritt 6: Erste Problembehebung ✓

Falls etwas nicht läuft:

**Docker Fehler?**
```bash
# 1. Logs anschauen
docker-compose logs doener-app
docker-compose logs doener-db

# 2. Neu bauen wenn nötig
docker-compose down -v
docker-compose up --build -d

# 3. Datenbank-Shell
docker-compose exec doener-db psql -U foodorder -d foodorder
```

**npm Fehler?**
```bash
# 1. Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install

# 2. Prisma neu generieren
npx prisma generate

# 3. Datenbank neu pushen
npx prisma db push --skip-generate
```

**Port 3000 belegt?**
```bash
# Port finden
lsof -i :3000          # Mac/Linux
netstat -ano | grep 3000  # Windows

# Oder andere Port verwenden
npm run dev -- -p 3001
```

## Schritt 7: Verifizierung ✓

### Credentials-Login (Standard):
```bash
1. Anmelden als "max.mustermann@firma.de" / "password123"
2. Produkt "Döner Kebab" in den Warenkorb
3. Fleisch + Soße + Extras wählen
4. Warenkorb ansehen (korrekte Preise?)
5. Bestellung aufgeben
6. Als Admin anmelden und Bestellung sehen
```

### OIDC/SSO-Login (falls aktiviert):
- [ ] Login-Seite zeigt nur "Mit SSO anmelden"-Button (kein Credentials-Form)
- [ ] Klick auf Button redirectet zu OIDC-Provider
- [ ] Login beim OIDC-Provider funktioniert
- [ ] Nach Login wird automatisch zur App zurückgeleitet
- [ ] Neuer User wurde in DB erstellt (Admin-Panel)
- [ ] Falls Email = `OIDC_SUPERADMIN_EMAIL`: Rolle ist `SUPER_ADMIN`
- [ ] Sonst: Rolle ist `EMPLOYEE`

**Wenn alles funktioniert: ✅ Setup erfolgreich!**

## Schritt 8: Dokumentation ✓

Für weitere Infos:
- [ ] [SETUP.md](./SETUP.md) - Detaillierte Anleitung
- [ ] [README.md](./README.md) - Features und Architektur
- [ ] [Dockerfile](./Dockerfile) - Container-Konfiguration
- [ ] [docker-compose.yml](./docker-compose.yml) - Services und Volumes

## 🎉 Wenn alles abhaken ist:

Glückwunsch! Das Projekt läuft auf deinem System.

**Nächste Schritte:**
- Code erkunden: `src/` Ordner
- Produkte hinzufügen: Admin-Dashboard
- SMTP testen: Bestellen auslösen, E-Mail-Versand überprüfen
- Features implementieren: Lies [README.md](./README.md)

---

**Probleme?** Siehe [SETUP.md](./SETUP.md) Troubleshooting-Sektion
