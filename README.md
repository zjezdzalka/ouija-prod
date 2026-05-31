# ouija 👁️

> Samohostedowany komunikator internetowy zbudowany w Next.js, Express, PostgreSQL i Redis.

[![Docker Image CI](https://github.com/zjezdzalka/ouija/actions/workflows/test-docker-compose.yml/badge.svg)](https://github.com/zjezdzalka/ouija/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Czym jest ouija?

ouija to aplikacja webowa do komunikacji w czasie rzeczywistym, którą możesz postawić samodzielnie. Cały stos działa przez Docker — dane, infrastruktura i wiadomości pozostają pod Twoją kontrolą. Aplikacja obsługuje czaty prywatne i grupowe, reakcje emoji, załączniki mediów oraz zarządzanie znajomymi.

## Demo — działająca instancja

Aplikacja jest hostowana 24/7 na niezależnym serwerze i dostępna publicznie — nie trzeba jej lokalnie budować ani instalować, żeby jej używać:

**https://ouija.rytui.dev/**

Lokalny setup (Docker) jest potrzebny tylko jeśli chcesz uruchomić własną instancję lub rozwijać kod.

## Stack technologiczny

| Warstwa     | Technologia                           |
|-------------|---------------------------------------|
| Frontend    | Next.js 15 (App Router), SCSS, TypeScript |
| Backend     | Express 5, TypeScript, Node.js        |
| Baza danych | PostgreSQL 15 + Prisma ORM            |
| Cache       | Redis 7                               |
| Kontener    | Docker + Docker Compose               |

---

## Szybki start (Docker — zalecane)

### Wymagania

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/)
- Git

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/zjezdzalka/ouija.git
cd ouija
```

### 2. Utwórz plik środowiskowy

```bash
cp .envs/.env.example .env
```

Otwórz `.env` i zmień co najmniej hasła:

```env
POSTGRES_USER=ouija
POSTGRES_PASSWORD=twoje_bezpieczne_haslo
POSTGRES_DB=ouija
DATABASE_URL=postgresql://ouija:twoje_bezpieczne_haslo@postgres:5432/ouija

REDIS_PASSWORD=twoje_haslo_redis
REDIS_HOST=redis
REDIS_PORT=6379

APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
CDN_BASE_URL=http://localhost:3001/api/media
```

> **SMTP jest opcjonalne.** Zostaw `AUTH_REQUIRE_EMAIL_VERIFICATION=false` i `AUTH_ENABLE_PASSWORD_RESET=false`, jeśli nie masz serwera SMTP. Szczegóły w [docs/smtp.md](docs/smtp.md).

### 3. Uruchom aplikację

```bash
docker compose up
```

Pierwsze uruchomienie buduje obrazy — zajmuje to kilka minut. Migracje bazy danych wykonywane są automatycznie przy starcie kontenera API.

Po uruchomieniu:

| Usługa      | Adres URL                          |
|-------------|------------------------------------|
| Aplikacja   | http://localhost:3000              |
| REST API    | http://localhost:3001/api          |
| Swagger UI  | http://localhost:3001/api-docs     |

---

## Uruchamianie w środowisku JetBrains (WebStorm / IntelliJ)

Projekt zawiera gotowe konfiguracje uruchomień w katalogu `.run/`. Po otwarciu projektu w JetBrains IDE pojawią się automatycznie na liście konfiguracji w górnym pasku.

| Konfiguracja              | Opis                                                                 |
|---------------------------|----------------------------------------------------------------------|
| `docker-compose-db`       | Uruchamia tylko PostgreSQL i Redis (Docker). Punkt startowy dla dev. |
| `docker-compose-apps`     | Buduje i uruchamia API + Web przez Docker (`--build`).               |
| `dev:api`                 | Uruchamia backend lokalnie z hot-reload (nodemon).                   |
| `dev:web`                 | Uruchamia frontend lokalnie z hot-reload (Next.js dev).              |
| `test:api`                | Uruchamia testy jednostkowe backendu (Jest).                         |
| `test:web`                | Uruchamia testy jednostkowe frontendu (Vitest).                      |
| `prisma:studio`           | Resetuje i uruchamia lokalną bazę dev, a następnie otwiera Prisma Studio. |

**Typowy workflow deweloperski w JetBrains:**
1. Uruchom `docker-compose-db` — startuje PostgreSQL i Redis w tle.
2. Uruchom `dev:api` — backend na `http://localhost:3001`.
3. Uruchom `dev:web` — frontend na `http://localhost:3000`.

> **Uwaga:** Konfiguracje `dev:api` i `dev:web` wymagają lokalnej instalacji Node.js 20+ oraz wykonanego `npm install`. Konfiguracje `docker-compose-*` wymagają działającego Docker Desktop.

---

## Uruchamianie lokalnie (bez Docker)

Szczegółowy przewodnik w [docs/development.md](docs/development.md). Skrót:

```bash
# 1. Uruchom tylko infrastrukturę
docker compose up postgres redis -d

# 2. Zainstaluj zależności
npm install

# 3. Utwórz apps/api/.env (patrz docs/development.md)

# 4. Zastosuj migracje
npm run prisma:dev

# 5. Backend (terminal 1)
npm run dev:api

# 6. Frontend (terminal 2)
npm run dev:web
```

---

## Dokumentacja

| Dokument | Opis |
|---|---|
| [Architektura](docs/architecture.md) | Struktura aplikacji — warstwy, przepływ danych, cache Redis |
| [Schemat bazy danych](docs/database.md) | Modele, relacje i enumy |
| [Zmienne środowiskowe](docs/environment.md) | Pełny opis wszystkich zmiennych `.env` |
| [Konfiguracja SMTP](docs/smtp.md) | Gmail, Outlook i generyczny SMTP |
| [Przewodnik deweloperski](docs/development.md) | Uruchamianie lokalne, testy, dane seed |
| [Contributing](docs/contributing.md) | Jak wnosić wkład do projektu |

API jest w pełni udokumentowane przez Swagger UI pod `/api-docs` kiedy serwer działa.

---

## Struktura projektu

```
ouija/
├── apps/
│   ├── api/                 # Backend Express
│   │   ├── prisma/          # Schemat bazy danych i migracje
│   │   │   └── dev/         # Skrypty generowania danych testowych
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── routers/
│   │   │   ├── middleware/
│   │   │   └── lib/         # Redis, email, tokeny
│   │   └── tests/           # Testy jednostkowe i integracyjne
│   └── web/                 # Frontend Next.js
│       └── src/app/         # Strony App Router
├── docs/                    # Dokumentacja
├── .run/                    # Konfiguracje uruchomień JetBrains
├── .envs/                   # Szablony konfiguracji środowiskowej
│   ├── .env.example
│   ├── .env.smtp.gmail
│   ├── .env.smtp.outlook
│   └── .env.smtp.generic
├── .github/workflows/       # CI/CD GitHub Actions
└── docker-compose.yaml
```

---

## Testy

```bash
# Testy API (Jest + Supertest)
npm run test:api

# Testy frontendu (Vitest)
npm run test:web
```

Dostępna jest również kolekcja Postman pod `apps/api/tests/ouija.postman_collection.json`.

---

## Licencja

ouija jest dostępna na licencji [MIT](LICENSE).
