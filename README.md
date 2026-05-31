# ouija 👁️

> Open-source, self-hosted internet messenger built with Next.js, Express, PostgreSQL and Redis.

[![Docker Image CI](https://github.com/internuntiae/ouija/actions/workflows/test-docker-compose.yml/badge.svg)](https://github.com/internuntiae/ouija/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is ouija?

ouija is a self-hostable web chat application. The entire stack runs via Docker — you own your data, your infrastructure, your messages. It supports private and group chats, emoji reactions, media attachments, friend management, and optionally end-to-end encryption (E2EE) via a Diffie-Hellman key exchange algorithm.

## Tech stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | Next.js 15 (App Router), SCSS     |
| Backend   | Express 5, TypeScript             |
| Database  | PostgreSQL 15 + Prisma ORM        |
| Cache     | Redis 7                           |
| Container | Docker + Docker Compose           |

---

## Quick start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/internuntiae/ouija.git
cd ouija
```

### 2. Create the environment file

```bash
cp .envs/.env.example .env
```

Edit `.env` and at minimum change the passwords:

```env
POSTGRES_USER=ouija
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=ouija
DATABASE_URL=postgresql://ouija:your_secure_password_here@postgres:5432/ouija

REDIS_PASSWORD=your_redis_password_here
REDIS_HOST=redis
REDIS_PORT=6379

APP_URL=http://localhost:3000
```

> **SMTP is optional.** Leave `AUTH_REQUIRE_EMAIL_VERIFICATION=false` and `AUTH_ENABLE_PASSWORD_RESET=false` if you don't have an SMTP server. See [Email / SMTP setup](docs/smtp.md) to enable these features.

### 3. Start the app

```bash
docker compose up
```

The first run will build the images — this takes a few minutes.

Once started:

| Service     | URL                              |
|-------------|----------------------------------|
| Web app     | http://localhost:3000            |
| REST API    | http://localhost:3001/api        |
| Swagger UI  | http://localhost:3001/api-docs   |

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | How the app is structured — layers, data flow, Redis caching |
| [Database schema](docs/database.md) | All models, relations, and enums |
| [Environment variables](docs/environment.md) | Full reference for all `.env` variables |
| [SMTP / Email setup](docs/smtp.md) | Gmail, Outlook, and generic SMTP configuration |
| [Development guide](docs/development.md) | Running locally without Docker, tests, seed data |
| [Contributing](docs/contributing.md) | How to contribute to the project |

The API is also fully documented via Swagger UI at `/api-docs` when the server is running.

---

## Project structure

```
ouija/
├── apps/
│   ├── api/            # Express backend
│   │   ├── prisma/     # Database schema & migrations
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── routers/
│   │   │   └── lib/    # Redis, email, tokens
│   │   └── tests/
│   └── web/            # Next.js frontend
│       └── src/app/    # App Router pages
├── docs/               # This documentation
├── encryption_algo/    # Diffie-Hellman E2EE prototype
├── docker-compose.yaml
└── .envs/              # SMTP config templates
```

---

## License

ouija is licensed under the [MIT License](LICENSE).

## Contributing

Pull requests are welcome! See [Contributing](docs/contributing.md) for details.

## Bug reports

Please use the [GitHub Issues](https://github.com/internuntiae/ouija/issues) tracker with the provided issue template.
