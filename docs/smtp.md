# SMTP / Email setup

Email is **optional**. By default, `AUTH_REQUIRE_EMAIL_VERIFICATION` and `AUTH_ENABLE_PASSWORD_RESET` are both `false`, so ouija works with no SMTP configuration at all.

Enable email features by setting the flags to `true` in your `.env` and filling in the SMTP block.

---

## Gmail

Gmail requires an **App Password** — your normal account password will not work.

**Prerequisites:**
1. Enable 2-Step Verification on your Google account.
2. Go to **Google Account → Security → 2-Step Verification → App Passwords**.
3. Generate an App Password for "Mail". Copy the 16-character password.

**Add to `.env`:**

```env
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_ENABLE_PASSWORD_RESET=true

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxxxxxx
SMTP_FROM=Ouija <you@gmail.com>
```

> Gmail free accounts allow approximately 500 emails/day. For higher volume consider Google Workspace or a dedicated email provider.

---

## Outlook / Hotmail

```env
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_ENABLE_PASSWORD_RESET=true

SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@outlook.com
SMTP_PASSWORD=your_password
SMTP_FROM=Ouija <you@outlook.com>
```

> Microsoft may require you to allow "Less secure apps" or to use an App Password depending on your account settings.

---

## Generic SMTP (Mailgun, SendGrid, Brevo, etc.)

Most dedicated email providers give you SMTP credentials in their dashboard.

```env
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_ENABLE_PASSWORD_RESET=true

SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=Ouija <noreply@yourdomain.com>
```

Set `SMTP_SECURE=true` and `SMTP_PORT=465` if your provider requires SSL instead of STARTTLS.

---

## Self-hosted (Postfix, Mailcow, etc.)

Point the SMTP variables at your own mail server. Make sure:
- The server accepts connections from the Docker network
- The `SMTP_FROM` address matches a domain your server is authorised to send from

---

## Token lifetimes

| Token type | Lifetime |
|---|---|
| Email verification | 24 hours |
| Password reset | 1 hour |

Tokens are one-time use — they are deleted from Redis immediately after being consumed.
