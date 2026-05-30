# Development guide

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for the database services)
- npm

---

## Running locally (without full Docker)

For active development you'll usually want hot-reload on the API and web app while keeping the database services in Docker.

### 1. Start only the infrastructure

```bash
docker compose up postgres redis -d
```

### 2. Set up environment variables

Create `apps/api/.env` for the API:

```env
DATABASE_URL=postgresql://ouija:changeme@localhost:5432/ouija
REDIS_PASSWORD=changeme
REDIS_HOST=localhost
REDIS_PORT=6379
AUTH_REQUIRE_EMAIL_VERIFICATION=false
AUTH_ENABLE_PASSWORD_RESET=false
```

The root `.env` is only used by Docker Compose — local dev reads from `apps/api/.env` directly.

### 3. Install dependencies

```bash
npm install
```

### 4. Run database migrations

```bash
npm --workspace=apps/api run deploy
```

Or generate the Prisma client:

```bash
npm --workspace=apps/api run generate
```

### 5. Start the backend

```bash
npm run dev:api
```

The API starts at `http://localhost:3001` with nodemon watching for changes.

### 6. Start the frontend

In a second terminal:

```bash
npm run dev:web
```

The web app starts at `http://localhost:3000`.

---

## Seed data (mock users and chats)

To populate the database with generated test data:

```bash
# Generate the Prisma client first
npx prisma generate --schema=apps/api/prisma/schema.prisma

# Seed the database
npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

To generate a **different amount** of mock data (default is whatever the script produces):

```bash
python ./apps/api/prisma/dev/data_gen.py <amount>
```

This regenerates `insert.sql` with the requested number of users/chats/messages, then the seed command applies it.

---

## Running tests

```bash
# All API tests
npm run test:api

# Watch mode
npm run test:api:watch
```

Tests use Supertest against the real Express app with a test database. The setup lives in `apps/api/tests/setup.ts` and fixtures in `apps/api/tests/fixtures.ts`.

Test suites:

| File | Coverage |
|---|---|
| `chat.test.ts` | Chat CRUD, membership |
| `friendship.test.ts` | Friend requests, accept/block |
| `message.test.ts` | Sending, editing, deleting messages |
| `reaction.test.ts` | Adding/removing reactions |
| `user.test.ts` | Profile reads and updates |
| `health.test.ts` | `/api/health` endpoint |
| `hash.test.ts` | SHA-256 hashing utility |

---

## Postman collection

A complete Postman collection is available at:

```
apps/api/tests/ouija.postman_collection.json
```

Import it into Postman or Bruno to explore and test all API endpoints interactively.

---

## Prisma Studio

Visual database browser:

```bash
npm --workspace=apps/api run studio
```

Opens at `http://localhost:5555`.

---

## Code quality

```bash
# Format all TypeScript and SCSS
npm run format

# Check formatting without writing
npm run format:check

# Lint
npm run lint

# Lint with auto-fix
npm run lint:fix
```

Husky pre-commit hooks run ESLint + Prettier automatically. Pre-push hooks run lint.

---

## Building for production

```bash
npm run build:api
npm run build:web
```

Or just use Docker Compose, which handles the build step automatically:

```bash
docker compose up --build
```

---

## Project scripts reference

| Command | Description |
|---|---|
| `npm run dev:api` | Start API in dev/watch mode |
| `npm run dev:web` | Start web app in dev mode |
| `npm run build:api` | Build API TypeScript |
| `npm run build:web` | Build Next.js app |
| `npm run test:api` | Run API test suite |
| `npm run format` | Format all source files |
| `npm run lint` | Lint all source files |
