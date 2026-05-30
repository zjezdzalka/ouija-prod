# Database schema

ouija uses PostgreSQL 15 with Prisma ORM. The schema lives in `apps/api/prisma/schema.prisma`.

## Entity-relationship overview

```
User ──────────────────────────────────────────────────────────────────┐
 │                                                                      │
 ├── Friendship (userId ↔ friendId, self-referential)                  │
 │                                                                      │
 ├── ChatUser ──── Chat ──── Message ──── Attachment                   │
 │                                   └─── Reaction (User ↔ Message)   │
 │                                                                      │
 └── MediaFile                                                          │
      (avatars and attachments owned by User)                          │
```

## Models

### User

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `email` | `String` | Unique |
| `password` | `String` | SHA-256 hash |
| `nickname` | `String` | Unique, stored lowercase |
| `status` | `UserStatus` | ONLINE / OFFLINE / AWAY / BUSY |
| `avatarUrl` | `String?` | Optional |
| `emailVerified` | `Boolean` | Default `false` |
| `createdAt` | `DateTime` | Auto |
| `updatedAt` | `DateTime` | Auto |

### Friendship

Bidirectional friend relationship stored as a directed edge. A friendship between A and B has two rows: `(A→B)` and `(B→A)`.

| Column | Type | Notes |
|---|---|---|
| `userId` | `String` | Part of composite PK |
| `friendId` | `String` | Part of composite PK |
| `status` | `FriendStatus` | PENDING / ACCEPTED / BLOCKED |

### Chat

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `name` | `String?` | Optional — used for group chats |
| `type` | `ChatType` | PRIVATE / GROUP |

### ChatUser

Join table between Chat and User.

| Column | Type | Notes |
|---|---|---|
| `chatId` | `String` | Part of composite PK |
| `userId` | `String` | Part of composite PK |
| `role` | `ChatRole` | MEMBER / ADMIN |
| `joinedAt` | `DateTime` | Auto |

### Message

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `chatId` | `String` | FK → Chat |
| `senderId` | `String` | FK → User |
| `content` | `String?` | Nullable (message may be attachment-only) |
| `sentAt` | `DateTime` | Auto |
| `editedAt` | `DateTime?` | Set on edit |

### Attachment

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `messageId` | `String` | FK → Message (cascade delete) |
| `url` | `String` | Path to media file |
| `type` | `AttachmentType` | IMAGE / VIDEO / FILE / AUDIO |

### Reaction

One reaction per user per message (composite PK).

| Column | Type | Notes |
|---|---|---|
| `messageId` | `String` | Part of composite PK |
| `userId` | `String` | Part of composite PK |
| `type` | `ReactionType` | See enum below |

### MediaFile

Tracks uploaded files — both avatars and chat attachments.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `ownerId` | `String` | FK → User |
| `filename` | `String` | Original filename |
| `storedName` | `String` | Name on disk |
| `mimeType` | `String` | e.g. `image/jpeg` |
| `size` | `Int` | Bytes |
| `purpose` | `MediaPurpose` | AVATAR / ATTACHMENT |
| `url` | `String` | Public URL |

---

## Enums

| Enum | Values |
|---|---|
| `UserStatus` | `ONLINE`, `OFFLINE`, `AWAY`, `BUSY` |
| `FriendStatus` | `PENDING`, `ACCEPTED`, `BLOCKED` |
| `ChatType` | `PRIVATE`, `GROUP` |
| `ChatRole` | `MEMBER`, `ADMIN` |
| `AttachmentType` | `IMAGE`, `VIDEO`, `FILE`, `AUDIO` |
| `ReactionType` | `LIKE`, `LOVE`, `LAUGH`, `SAD`, `ANGRY`, `THUMBS_UP`, `THUMBS_DOWN` |
| `MediaPurpose` | `AVATAR`, `ATTACHMENT` |

---

## Migrations

Migrations live in `apps/api/prisma/migrations/`. They are applied automatically when using Docker (`prisma migrate deploy` runs on container start). Key migrations:

| Migration | Change |
|---|---|
| `20260416195510_dev` | Initial schema |
| `20260419233025_add_media` | MediaFile model |
| `20260421000000_add_verification` | `emailVerified` flag on User |
| `20260424192033_message_id_change` | Message ID type change |

To apply migrations manually:

```bash
npm --workspace=apps/api run deploy
```

To open Prisma Studio (GUI database browser):

```bash
npm --workspace=apps/api run studio
```
