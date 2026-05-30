# Environment variables

All configuration is done through a single `.env` file in the project root. Copy the template before making changes:

```bash
cp .envs/.env.example .env
```

---

## Database

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `ouija` | PostgreSQL username |
| `POSTGRES_PASSWORD` | — | **Required.** Set a strong password. |
| `POSTGRES_DB` | `ouija` | Database name |
| `DATABASE_URL` | — | Full connection string. Must match the values above. Format: `postgresql://<user>:<password>@postgres:5432/<db>` |

> **Note:** `postgres` in the hostname refers to the Docker service name, not `localhost`. Use `localhost` only when running the API outside Docker.

---

## Redis

| Variable | Default | Description |
|---|---|---|
| `REDIS_PASSWORD` | — | **Required.** Redis auth password. |
| `REDIS_HOST` | `redis` | Redis hostname (Docker service name). Use `localhost` for local dev. |
| `REDIS_PORT` | `6379` | Redis port. |

---

## Application URL

| Variable | Default | Description |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Public-facing URL of the web app. Used in email links (verification, password reset). Change this when deploying publicly. |

---

## Auth feature flags

Both flags default to `false`. They are independent — you can enable password reset without requiring email verification.

| Variable | Default | Description |
|---|---|---|
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `false` | When `true`, newly registered accounts must verify their email before logging in. Requires SMTP. |
| `AUTH_ENABLE_PASSWORD_RESET` | `false` | When `true`, the "forgot password" flow is active on the login page. Requires SMTP. |

When both are `false`, the app works fully without any email/SMTP configuration. This is the recommended setup for local hosting.

---

## SMTP / Email

Only needed when either auth flag above is `true`. The API docker container passes these through directly to Nodemailer.

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port (587 = STARTTLS, 465 = SSL) |
| `SMTP_SECURE` | `false` | Set `true` for port 465 (SSL), `false` for 587 (STARTTLS) |
| `SMTP_USER` | — | SMTP username / email address |
| `SMTP_PASSWORD` | — | SMTP password or app-specific password |
| `SMTP_FROM` | `Ouija <noreply@ouija.local>` | From address shown in emails |

See [SMTP setup](smtp.md) for provider-specific instructions.

---

## Complete example

```env
# Database
POSTGRES_USER=ouija
POSTGRES_PASSWORD=SuperSecretPassword123
POSTGRES_DB=ouija
DATABASE_URL=postgresql://ouija:SuperSecretPassword123@postgres:5432/ouija

# Redis
REDIS_PASSWORD=AnotherSecretPassword
REDIS_HOST=redis
REDIS_PORT=6379

# App
APP_URL=http://localhost:3000

# Auth (disabled for simple local setup)
AUTH_REQUIRE_EMAIL_VERIFICATION=false
AUTH_ENABLE_PASSWORD_RESET=false

# SMTP (leave empty when auth flags are false)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=Ouija <noreply@ouija.local>
```
