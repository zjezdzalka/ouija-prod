# Architecture

## Overview

ouija follows a classic layered architecture on the backend. Each HTTP request passes through a strict chain of responsibility: **router → controller → service → repository → database**. No layer skips another.

```
HTTP Request
     │
     ▼
  Router          (express routes, input parsing)
     │
     ▼
  Controller      (validates shape of request, maps to service call)
     │
     ▼
  Service         (business logic, orchestrates multiple repositories)
     │
     ├──▶ Repository (PostgreSQL via Prisma)
     │
     └──▶ Repository.redis (Redis cache)
```

## Services

| Service | Responsibility |
|---|---|
| `auth.service` | Registration, login, email verification, password reset |
| `user.service` | Profile reads and updates, avatar management |
| `chat.service` | Chat creation, membership, listing |
| `message.service` | Sending, editing, and deleting messages |
| `friendship.service` | Friend requests, accepting/blocking |
| `reaction.service` | Adding and removing emoji reactions |
| `media.service` | File uploads, avatar handling, attachment storage |

## Redis caching — message layer

Messages are cached in Redis using a **write-through / cache-aside** strategy scoped per `chatId`.

```
Read path:
  1. Check Redis list for chatId
  2. Cache hit  → return from Redis
  3. Cache miss → fetch from PostgreSQL, populate Redis, return

Write path:
  1. Write to PostgreSQL (source of truth)
  2. Push to Redis list (or invalidate key)
```

Redis also stores **short-lived tokens** for auth flows:

| Key pattern | TTL | Purpose |
|---|---|---|
| `verify:<token>` | 24 hours | Email verification one-time token |
| `pwreset:<token>` | 1 hour | Password reset one-time token |

Tokens are consumed on use (deleted from Redis immediately after reading).

## Frontend

The frontend is a standard Next.js 15 App Router application. Pages:

| Route | Description |
|---|---|
| `/` | Landing / redirect |
| `/login` | Login form |
| `/register` | Registration form |
| `/chats` | Main chat view |
| `/profile` | User profile, avatar, friend list |
| `/verify-email` | Email verification callback |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |

SCSS modules are used for styling — one `.module.scss` per page.

## Docker services

```
docker-compose.yaml
│
├── postgres       PostgreSQL 15 — persistent volume pg-data
├── redis          Redis 7 with password auth — persistent volume redis-data
├── api            Express backend — port 3001, volume media-uploads
└── web            Next.js frontend — port 3000
```

All services share a private bridge network (`app-network`). Only ports 3000 and 3001 are exposed to the host.

Health checks are configured on both `api` (via `/api/health`) and `web`, so `docker compose up --wait` blocks until they pass.

## E2EE (experimental)

The `encryption_algo/` directory contains a prototype implementation of Diffie-Hellman key exchange written in both TypeScript and C++. The algorithm is not yet integrated into the main application — it exists as a proof of concept for the planned end-to-end encryption feature.

The prototype generates large prime private keys, computes public keys, and derives a shared secret — standard DH. Integration into the message flow is a planned milestone.

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

1. Builds all Docker images
2. Starts PostgreSQL and Redis, waits for readiness
3. Starts API and Web services
4. Runs `curl -f` health checks on both
5. Dumps logs on failure

Image publishing to Docker Hub (`guc10/ouija-api`, `guc10/ouija-web`) is prepared in the workflow but currently disabled.
