# Przewodnik deweloperski

## Wymagania wstępne

- Node.js 20+
- Docker + Docker Compose (dla usług bazy danych)
- npm

---

## Uruchamianie lokalnie (bez pełnego Docker)

Przy aktywnym developmencie zazwyczaj chcesz mieć hot-reload na API i aplikacji webowej, trzymając usługi bazodanowe w Docker.

### 1. Uruchom tylko infrastrukturę

**Przez terminal:**

```bash
docker compose up postgres redis -d
```

**Przez JetBrains:** uruchom konfigurację `docker-compose-db` z listy Run Configurations.

### 2. Skonfiguruj zmienne środowiskowe

Utwórz `apps/api/.env` dla backendu:

```env
DATABASE_URL=postgresql://ouija:changeme@localhost:5432/ouija
REDIS_PASSWORD=changeme
REDIS_HOST=localhost
REDIS_PORT=6379
AUTH_REQUIRE_EMAIL_VERIFICATION=false
AUTH_ENABLE_PASSWORD_RESET=false
```

> Plik `.env` w katalogu głównym jest używany tylko przez Docker Compose. Lokalny dev czyta z `apps/api/.env` bezpośrednio. Zwróć uwagę na różnicę w hostach: `postgres`/`redis` (Docker) vs `localhost` (dev lokalny).

### 3. Zainstaluj zależności

```bash
npm install
```

### 4. Wykonaj migracje bazy danych

```bash
npm run prisma:dev
```

Lub wygeneruj tylko klienta Prisma (bez migracji):

```bash
npm run prisma:generate
```

### 5. Uruchom backend

**Przez terminal:**

```bash
npm run dev:api
```

**Przez JetBrains:** uruchom konfigurację `dev:api`.

API startuje na `http://localhost:3001` z nodemon obserwującym zmiany.

### 6. Uruchom frontend

**Przez terminal (drugi terminal):**

```bash
npm run dev:web
```

**Przez JetBrains:** uruchom konfigurację `dev:web`.

Aplikacja webowa startuje na `http://localhost:3000`.

---

## Konfiguracje JetBrains (.run/)

Katalog `.run/` zawiera gotowe konfiguracje uruchomień dla WebStorm / IntelliJ IDEA. Są one wykrywane automatycznie przy otwarciu projektu.

| Konfiguracja          | Typ           | Opis |
|-----------------------|---------------|------|
| `docker-compose-db`   | Docker Compose | Uruchamia `postgres` i `redis` w tle |
| `docker-compose-apps` | Docker Compose | Buduje (`--build`) i uruchamia `api` + `web` |
| `dev:api`             | npm            | `npm run dev:api` — backend z hot-reload |
| `dev:web`             | npm            | `npm run dev:web` — frontend z hot-reload |
| `test:api`            | npm            | `npm run test:api` — testy backendu |
| `test:web`            | npm            | `npm run test:web` — testy frontendu |
| `prisma:studio`       | npm            | Sekwencja: reset → migrate dev → generate → studio |

Konfiguracja `prisma:studio` wykonuje przed uruchomieniem trzy kroki wstępne: `prisma:reset`, `prisma:dev`, `prisma:generate`. Dzięki temu Prisma Studio zawsze otwiera się na aktualnym schemacie.

---

## Dane seed (mock użytkownicy i czaty)

Aby zasilić bazę danych wygenerowanymi danymi testowymi:

```bash
# Wygeneruj klienta Prisma
npx prisma generate --schema=apps/api/prisma/schema.prisma

# Zastosuj seed
npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

Aby wygenerować **inną ilość** danych (domyślna ilość jest zakodowana w skrypcie):

```bash
python ./apps/api/prisma/dev/data_gen.py <ilość>
```

Skrypt regeneruje `insert.sql` z żądaną liczbą użytkowników/czatów/wiadomości, a następnie polecenie seed aplikuje go.

---

## Uruchamianie testów

```bash
# Wszystkie testy API
npm run test:api

# Tryb watch
npm run test:api:watch

# Testy frontendu
npm run test:web
```

Testy backendu używają Supertest względem prawdziwej aplikacji Express z testową bazą danych. Setup w `apps/api/tests/setup.ts`, fixtures w `apps/api/tests/fixtures.ts`.

Zestawy testów:

| Plik | Pokrycie |
|---|---|
| `auth.test.ts` / `auth.service.test.ts` | Rejestracja, logowanie, weryfikacja email |
| `chat.test.ts` / `chat.service.test.ts` | CRUD czatów, zarządzanie członkami |
| `friendship.test.ts` / `friendship.service.test.ts` | Zaproszenia do znajomych, akceptacja/blokowanie |
| `message.test.ts` / `message.service.test.ts` | Wysyłanie, edycja, usuwanie wiadomości |
| `reaction.test.ts` | Dodawanie/usuwanie reakcji |
| `user.test.ts` / `user.service.test.ts` | Odczyt i aktualizacja profilu |
| `health.test.ts` | Endpoint `/api/health` |
| `hash.test.ts` | Utility hashowania SHA-256 |

---

## Kolekcja Postman

Kompletna kolekcja Postman dostępna pod:

```
apps/api/tests/ouija.postman_collection.json
```

Zaimportuj ją do Postman lub Bruno, aby eksplorować i testować wszystkie endpointy API.

---

## Prisma Studio

Wizualna przeglądarka bazy danych:

```bash
npm run prisma:studio
```

**Przez JetBrains:** uruchom konfigurację `prisma:studio` (automatycznie wykonuje wcześniej reset i migracje).

Otwiera się pod `http://localhost:5555`.

---

## Jakość kodu

```bash
# Formatuj wszystkie pliki TypeScript i SCSS
npm run format

# Sprawdź formatowanie bez zapisu
npm run format:check

# Linting
npm run lint

# Linting z auto-naprawą
npm run lint:fix
```

Husky pre-commit hooks uruchamiają ESLint + Prettier automatycznie. Hooki pre-push uruchamiają lint.

---

## Budowanie na produkcję

```bash
npm run build:api
npm run build:web
```

Lub użyj Docker Compose, który obsługuje krok budowania automatycznie:

```bash
docker compose up --build
```

---

## Skróty skryptów

| Komenda | Opis |
|---|---|
| `npm run dev:api` | Uruchom API w trybie dev/watch |
| `npm run dev:web` | Uruchom aplikację webową w trybie dev |
| `npm run build:api` | Zbuduj TypeScript API |
| `npm run build:web` | Zbuduj aplikację Next.js |
| `npm run test:api` | Uruchom testy API |
| `npm run test:web` | Uruchom testy frontendu |
| `npm run format` | Formatuj wszystkie pliki źródłowe |
| `npm run lint` | Sprawdź wszystkie pliki źródłowe |
| `npm run prisma:dev` | Wykonaj migracje bazy danych |
| `npm run prisma:studio` | Otwórz Prisma Studio |
