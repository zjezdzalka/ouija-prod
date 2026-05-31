# Zmienne środowiskowe

Cała konfiguracja odbywa się przez jeden plik `.env` w katalogu głównym projektu. Przed uruchomieniem skopiuj szablon:

```bash
cp .envs/.env.example .env
```

---

## Różnica między środowiskiem Docker a lokalnym

| Środowisko | Plik `.env` | Hosty bazy danych |
|---|---|---|
| Docker Compose | `.env` w katalogu głównym | `postgres`, `redis` (nazwy serwisów Docker) |
| Lokalny dev | `apps/api/.env` | `localhost` |

Plik główny `.env` jest **tylko** dla Docker Compose. Przy lokalnym uruchomieniu API czyta `apps/api/.env` bezpośrednio.

---

## Baza danych

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `POSTGRES_USER` | `ouija` | Nazwa użytkownika PostgreSQL |
| `POSTGRES_PASSWORD` | — | **Wymagane.** Ustaw silne hasło. |
| `POSTGRES_DB` | `ouija` | Nazwa bazy danych |
| `DATABASE_URL` | — | Pełny connection string. Musi być spójny z powyższymi wartościami. Format: `postgresql://<user>:<password>@<host>:5432/<db>` |

> `postgres` w nazwie hosta odnosi się do nazwy serwisu Docker. Używaj `localhost` tylko przy uruchamianiu API poza Docker.

---

## Redis

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `REDIS_PASSWORD` | — | **Wymagane.** Hasło uwierzytelniania Redis. |
| `REDIS_HOST` | `redis` | Nazwa hosta Redis (nazwa serwisu Docker). Użyj `localhost` przy lokalnym dev. |
| `REDIS_PORT` | `6379` | Port Redis. |

---

## URL-e serwisów

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Publiczny URL aplikacji webowej. Używany w linkach email (weryfikacja, reset hasła). Zmień przy publicznym deploymencie. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Publiczny URL serwera API. Przekazywany do frontendu Next.js. |
| `CDN_BASE_URL` | `http://localhost:3001/api/media` | Bazowy URL CDN — doklejany do ścieżek mediów przy zwracaniu URL-i do klientów. |

---

## Flagi funkcji auth

Obie flagi domyślnie `false`. Są niezależne — możesz włączyć reset hasła bez wymaganej weryfikacji email.

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `false` | Gdy `true`, nowe konta muszą zweryfikować email przed zalogowaniem. Wymaga SMTP. |
| `AUTH_ENABLE_PASSWORD_RESET` | `false` | Gdy `true`, przepływ „zapomniane hasło" jest aktywny na stronie logowania. Wymaga SMTP. |

Gdy obie flagi są `false`, aplikacja działa w pełni bez konfiguracji email/SMTP. Jest to zalecana konfiguracja dla hostingu lokalnego.

---

## SMTP / Email

Wymagane tylko gdy którakolwiek z powyższych flag ma wartość `true`. Kontener Docker API przekazuje te zmienne bezpośrednio do Nodemailer.

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `SMTP_HOST` | — | Nazwa hosta serwera SMTP |
| `SMTP_PORT` | `587` | Port SMTP (587 = STARTTLS, 465 = SSL) |
| `SMTP_SECURE` | `false` | Ustaw `true` dla portu 465 (SSL), `false` dla 587 (STARTTLS) |
| `SMTP_USER` | — | Nazwa użytkownika SMTP / adres email |
| `SMTP_PASSWORD` | — | Hasło SMTP lub hasło aplikacji |
| `SMTP_FROM` | `Ouija <noreply@ouija.local>` | Adres nadawcy widoczny w emailach |

Gotowe szablony dla poszczególnych dostawców znajdują się w `.envs/`:

| Plik | Dostawca |
|---|---|
| `.envs/.env.smtp.gmail` | Gmail (wymaga App Password) |
| `.envs/.env.smtp.outlook` | Outlook / Hotmail |
| `.envs/.env.smtp.generic` | Dowolny dostawca SMTP (Mailgun, SendGrid itp.) |

Skopiuj odpowiedni szablon i uzupełnij wartości, następnie wklej do swojego `.env`. Szczegółowe instrukcje w [docs/smtp.md](smtp.md).

---

## Kompletny przykład

```env
# Baza danych
POSTGRES_USER=ouija
POSTGRES_PASSWORD=SuperSecretPassword123
POSTGRES_DB=ouija
DATABASE_URL=postgresql://ouija:SuperSecretPassword123@postgres:5432/ouija

# Redis
REDIS_PASSWORD=AnotherSecretPassword
REDIS_HOST=redis
REDIS_PORT=6379

# URL-e
APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
CDN_BASE_URL=http://localhost:3001/api/media

# Auth (wyłączone dla prostego lokalnego setupu)
AUTH_REQUIRE_EMAIL_VERIFICATION=false
AUTH_ENABLE_PASSWORD_RESET=false

# SMTP (zostaw puste gdy flagi auth są false)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=Ouija <noreply@ouija.local>
```
