import hashlib
import sys
import random
import uuid

# ---------------------------------------------------------------------------
# SQL helpers – every value that touches user-controlled or random text must
# go through one of these functions before being embedded in SQL.
# ---------------------------------------------------------------------------

def escape_sql(text):
    """
    Escape a Python value for safe embedding inside a SQL single-quoted literal.
    - None  → NULL  (unquoted)
    - str   → '<escaped>' where every ' is doubled and the result is wrapped in ''
    - int / float → rendered as a bare numeric literal (no quotes needed)
    - Everything else is cast to str first.
    """
    if text is None:
        return "NULL"
    if isinstance(text, (int, float)):
        return str(text)
    safe = str(text).replace("'", "''")
    return f"'{safe}'"


def escape_enum(value, allowed):
    """
    Validate that *value* is one of the *allowed* enum literals and return it
    as a single-quoted SQL string.  Raises ValueError on an unexpected value so
    bugs surface immediately rather than silently writing bad SQL.
    """
    if value not in allowed:
        raise ValueError(f"Unexpected enum value {value!r}; allowed: {allowed}")
    return escape_sql(value)


def escape_id(value):
    """
    Thin wrapper for identifier-style values (cuid-like strings, 'u1', 'c1', …).
    Validates that the value contains only safe characters so it can never
    break out of a quoted literal even if something upstream goes wrong.
    """
    s = str(value)
    if not all(c.isalnum() or c in ('-', '_') for c in s):
        raise ValueError(f"Unsafe id value: {s!r}")
    return escape_sql(s)


# ---------------------------------------------------------------------------
# Enum constants mirroring the Prisma schema
# ---------------------------------------------------------------------------

USER_STATUSES      = ['ONLINE', 'OFFLINE', 'AWAY', 'BUSY']
FRIEND_STATUSES    = ['ACCEPTED', 'PENDING', 'BLOCKED']
CHAT_TYPES         = ['PRIVATE', 'GROUP']
CHAT_ROLES         = ['MEMBER', 'ADMIN']
ATTACHMENT_TYPES   = ['IMAGE', 'VIDEO', 'FILE', 'AUDIO']
REACTION_TYPES     = ['LIKE', 'LOVE', 'LAUGH', 'SAD', 'ANGRY', 'THUMBS_UP', 'THUMBS_DOWN']
MEDIA_PURPOSES     = ['AVATAR', 'ATTACHMENT']

# ---------------------------------------------------------------------------
# Realistic-looking fake CDN data
# ---------------------------------------------------------------------------

CDN_BASE = "http://localhost:3001/api/media"

IMAGE_FILENAMES = [
    "screenshot_2024.png", "photo_holiday.jpg", "meme_funny.gif",
    "diagram_arch.png", "team_photo.jpg", "logo_draft.png",
    "avatar_upload.webp", "screenshot_bug.png", "banner_v2.jpg",
]
VIDEO_FILENAMES = [
    "demo_recording.mp4", "onboarding_clip.webm", "standup_2024.mp4",
    "tutorial_pt1.mp4", "review_session.mov",
]
FILE_FILENAMES = [
    "q3_report.pdf", "design_spec.pdf", "roadmap_2025.docx",
    "meeting_notes.txt", "architecture.md", "budget_draft.xlsx",
]
AUDIO_FILENAMES = [
    "voice_note.ogg", "podcast_ep12.mp3", "standup_audio.m4a",
    "interview_raw.wav",
]

MIME_MAP = {
    "IMAGE": {"png": "image/png", "jpg": "image/jpeg", "gif": "image/gif",
               "webp": "image/webp"},
    "VIDEO": {"mp4": "video/mp4", "webm": "video/webm",
               "mov": "video/quicktime"},
    "FILE":  {"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
               "txt": "text/plain", "md": "text/markdown",
               "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    "AUDIO": {"ogg": "audio/ogg", "mp3": "audio/mpeg",
               "m4a": "audio/mp4", "wav": "audio/wav"},
}

FILENAMES_BY_TYPE = {
    "IMAGE": IMAGE_FILENAMES,
    "VIDEO": VIDEO_FILENAMES,
    "FILE":  FILE_FILENAMES,
    "AUDIO": AUDIO_FILENAMES,
}

def pick_filename_and_mime(att_type):
    filename = random.choice(FILENAMES_BY_TYPE[att_type])
    ext = filename.rsplit(".", 1)[-1]
    mime = MIME_MAP[att_type].get(ext, "application/octet-stream")
    stored = f"{uuid.uuid4().hex}_{filename}"
    url = f"{CDN_BASE}/uploads/{stored}"
    return filename, stored, mime, url

# ---------------------------------------------------------------------------
# Nickname generator helpers
# ---------------------------------------------------------------------------

PREFIXES = ["Alpha", "Beta", "Cyber", "Dark", "Echo", "Frost", "Giga", "Hyper", "Iron", "Jade",
            "Luna", "Mist", "Neon", "Onyx", "Pixel", "Quantum", "Rapid", "Solar", "Titan", "Vortex"]
NOUNS    = ["Wolf", "Knight", "Coder", "Ghost", "Falcon", "Blaze", "Eagle", "Nova", "Hunter", "Storm",
            "Rider", "Sage", "Panda", "Rex", "Viper", "Zion", "Orbit", "Pixel", "Dragon", "Shadow"]

MESSAGE_SAMPLES = [
    "Has anyone seen the documentation?", "I'll be OOO tomorrow.",
    "Check out this new feature!", "Can we hop on a quick call?", "LGTM!",
    "Deployment successful.", "Does anyone have the API keys?",
    "Working on the refactor now.", "Coffee break?",
    "Just pushed the latest changes.", "This PR needs another review.",
    "Staging environment is down again.", "Tests are all green!",
    "Anyone free for a quick sync?", "Updated the README.",
]

# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_static_file(extra_count):
    extra_count = min(extra_count, 1000)

    with open("insert.sql", "w", encoding="utf-8") as f:

        # ── 0. Preamble ──────────────────────────────────────────────────────
        f.write("-- Auto-generated seed file.  Do NOT edit by hand.\n\n")
        f.write("-- 0. Clear existing data\n")
        f.write(
            'TRUNCATE TABLE "User", "Friendship", "Chat", "ChatUser", '
            '"Message", "Attachment", "Reaction", "MediaFile" CASCADE;\n\n'
        )

        # ── 1. Users ─────────────────────────────────────────────────────────
        f.write("-- 1. Insert Users\n")
        f.write('INSERT INTO "User" ("id", "email", "password", "nickname", "status", "updatedAt") VALUES\n')

        users = []
        used_nicks = set()

        for i in range(1, extra_count + 1):
            u_id = f"u{i}"
            while True:
                nick = f"{random.choice(PREFIXES)}{random.choice(NOUNS)}{random.randint(10, 999)}"
                if nick not in used_nicks:
                    used_nicks.add(nick)
                    break

            email    = f"{nick.lower()}@example.com"
            status   = random.choice(USER_STATUSES)
            pw_hash  = hashlib.sha256(f"hashed_{i}".encode()).hexdigest()
            # avatar URL for ~60 % of users
            avatar   = f"{CDN_BASE}/avatars/{uuid.uuid4().hex}.jpg" if random.random() < 0.6 else None

            users.append({
                "id": u_id, "email": email, "password": pw_hash,
                "nickname": nick, "status": status, "avatarUrl": avatar,
            })

        user_lines = [
            "    ({id}, {email}, {password}, {nickname}, {status}, NOW())".format(
                id       = escape_id(u["id"]),
                email    = escape_sql(u["email"]),
                password = escape_sql(u["password"]),
                nickname = escape_sql(u["nickname"]),
                status   = escape_enum(u["status"], USER_STATUSES),
            )
            for u in users
        ]
        f.write(",\n".join(user_lines) + ";\n\n")

        user_ids = [u["id"] for u in users]

        # ── 2. MediaFile (CDN records) ────────────────────────────────────────
        f.write("-- 2. Insert MediaFile (CDN records)\n")
        f.write('INSERT INTO "MediaFile" ("id", "ownerId", "filename", "storedName", "mimeType", "size", "purpose", "url", "createdAt") VALUES\n')

        media_files = []
        # ~1 MediaFile per user on average (mix of avatars and attachments)
        for u in users:
            num_files = random.randint(0, 3)
            for _ in range(num_files):
                purpose  = random.choice(MEDIA_PURPOSES)
                att_type = "IMAGE" if purpose == "AVATAR" else random.choice(ATTACHMENT_TYPES)
                filename, stored, mime, url = pick_filename_and_mime(att_type)
                # Override url path for avatars
                if purpose == "AVATAR":
                    url = f"{CDN_BASE}/avatars/{stored}"

                media_files.append({
                    "id":         uuid.uuid4().hex,
                    "ownerId":    u["id"],
                    "filename":   filename,
                    "storedName": stored,
                    "mimeType":   mime,
                    "size":       random.randint(1024, 20_971_520),  # 1 KB – 20 MB
                    "purpose":    purpose,
                    "url":        url,
                })

        media_lines = [
            "    ({id}, {ownerId}, {filename}, {storedName}, {mimeType}, {size}, {purpose}, {url}, NOW())".format(
                id         = escape_sql(m["id"]),
                ownerId    = escape_id(m["ownerId"]),
                filename   = escape_sql(m["filename"]),
                storedName = escape_sql(m["storedName"]),
                mimeType   = escape_sql(m["mimeType"]),
                size       = escape_sql(m["size"]),
                purpose    = escape_enum(m["purpose"], MEDIA_PURPOSES),
                url        = escape_sql(m["url"]),
            )
            for m in media_files
        ]
        f.write(",\n".join(media_lines) + ";\n\n")

        # ── 3. Friendships ───────────────────────────────────────────────────
        f.write("-- 3. Insert Friendships\n")
        f.write('INSERT INTO "Friendship" ("userId", "friendId", "status", "updatedAt") VALUES\n')

        seen_pairs   = set()
        friendships  = []
        max_friends  = int(extra_count * 1.5)
        attempts     = 0

        while len(friendships) < max_friends and attempts < 10_000:
            u1, u2 = random.sample(user_ids, 2)
            pair   = tuple(sorted((u1, u2)))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                status = random.choice(FRIEND_STATUSES)
                friendships.append(
                    "    ({u1}, {u2}, {status}, NOW())".format(
                        u1     = escape_id(u1),
                        u2     = escape_id(u2),
                        status = escape_enum(status, FRIEND_STATUSES),
                    )
                )
            attempts += 1

        f.write(",\n".join(friendships) + ";\n\n")

        # ── 4. Chats ─────────────────────────────────────────────────────────
        f.write("-- 4. Insert Chats\n")
        f.write('INSERT INTO "Chat" ("id", "name", "type", "updatedAt") VALUES\n')

        num_chats = max(2, 2 + extra_count // 5)
        chats     = []

        for i in range(1, num_chats + 1):
            c_type = "PRIVATE" if i == 1 else ("GROUP" if i == 2 else random.choice(CHAT_TYPES))
            c_name = f"Channel {i}" if c_type == "GROUP" else None
            chats.append({"id": f"c{i}", "name": c_name, "type": c_type})

        chat_lines = [
            "    ({id}, {name}, {ctype}, NOW())".format(
                id    = escape_id(c["id"]),
                name  = escape_sql(c["name"]),
                ctype = escape_enum(c["type"], CHAT_TYPES),
            )
            for c in chats
        ]
        f.write(",\n".join(chat_lines) + ";\n\n")

        chat_ids = [c["id"] for c in chats]

        # ── 5. ChatUsers ─────────────────────────────────────────────────────
        f.write("-- 5. Add Users to Chats\n")
        f.write('INSERT INTO "ChatUser" ("chatId", "userId", "role") VALUES\n')

        seen_chat_users = set()
        chat_user_rows  = []

        def add_chat_user(c_id, u_id, role):
            key = (c_id, u_id)
            if key not in seen_chat_users:
                seen_chat_users.add(key)
                chat_user_rows.append(
                    "    ({chatId}, {userId}, {role})".format(
                        chatId = escape_id(c_id),
                        userId = escape_id(u_id),
                        role   = escape_enum(role, CHAT_ROLES),
                    )
                )

        # Seed first two chats with fixed members
        add_chat_user("c1", "u1", "MEMBER")
        add_chat_user("c1", "u2", "MEMBER")
        add_chat_user("c2", "u1", "ADMIN")
        add_chat_user("c2", "u2", "MEMBER")

        # Every user gets at least one chat membership
        for u_id in user_ids:
            c_id = random.choice(chat_ids)
            role = "ADMIN" if random.random() < 0.05 else "MEMBER"
            add_chat_user(c_id, u_id, role)

        f.write(",\n".join(chat_user_rows) + ";\n\n")

        # ── 6. Messages ──────────────────────────────────────────────────────
        f.write("-- 6. Insert Messages\n")
        f.write('INSERT INTO "Message" ("id", "chatId", "senderId", "content", "sentAt") VALUES\n')

        msg_rows   = []
        msg_id_seq = 1

        for _ in range(extra_count * 3):
            c_id   = random.choice(chat_ids)
            u_id   = random.choice(user_ids)
            content = random.choice(MESSAGE_SAMPLES)
            msg_rows.append(
                "    ({id}, {chatId}, {senderId}, {content}, NOW())".format(
                    id       = escape_sql(msg_id_seq),
                    chatId   = escape_id(c_id),
                    senderId = escape_id(u_id),
                    content  = escape_sql(content),
                )
            )
            msg_id_seq += 1

        f.write(",\n".join(msg_rows) + ";\n\n")

        total_messages = msg_id_seq - 1   # highest valid message id

        # ── 7. Attachments ───────────────────────────────────────────────────
        f.write("-- 7. Insert Attachments\n")
        f.write('INSERT INTO "Attachment" ("id", "messageId", "url", "type") VALUES\n')

        att_rows = []
        # ~20 % of messages get an attachment
        att_msg_ids = random.sample(
            range(1, total_messages + 1),
            k=min(max(1, total_messages // 5), total_messages),
        )

        for m_id in att_msg_ids:
            att_type = random.choice(ATTACHMENT_TYPES)
            _, _, _, url = pick_filename_and_mime(att_type)
            att_rows.append(
                "    ({id}, {messageId}, {url}, {atype})".format(
                    id        = escape_sql(uuid.uuid4().hex),
                    messageId = escape_sql(m_id),
                    url       = escape_sql(url),
                    atype     = escape_enum(att_type, ATTACHMENT_TYPES),
                )
            )

        f.write(",\n".join(att_rows) + ";\n\n")

        # ── 8. Reactions ─────────────────────────────────────────────────────
        f.write("-- 8. Insert Reactions\n")
        f.write('INSERT INTO "Reaction" ("messageId", "userId", "type", "createdAt") VALUES\n')

        seen_reactions = set()
        reaction_rows  = []

        # Each user reacts to ~5 % of messages on average
        attempts = 0
        target   = max(1, (extra_count * total_messages) // 200)
        target   = min(target, 1000)   # hard cap to keep the file manageable

        while len(reaction_rows) < target and attempts < target * 10:
            m_id = random.randint(1, total_messages)
            u_id = random.choice(user_ids)
            key  = (m_id, u_id)
            if key not in seen_reactions:
                seen_reactions.add(key)
                r_type = random.choice(REACTION_TYPES)
                reaction_rows.append(
                    "    ({messageId}, {userId}, {rtype}, NOW())".format(
                        messageId = escape_sql(m_id),
                        userId    = escape_id(u_id),
                        rtype     = escape_enum(r_type, REACTION_TYPES),
                    )
                )
            attempts += 1

        f.write(",\n".join(reaction_rows) + ";\n")

    print(
        f"insert.sql generated:\n"
        f"  Users:       {len(users)}\n"
        f"  MediaFiles:  {len(media_files)}\n"
        f"  Friendships: {len(friendships)}\n"
        f"  Chats:       {num_chats}\n"
        f"  ChatUsers:   {len(chat_user_rows)}\n"
        f"  Messages:    {total_messages}\n"
        f"  Attachments: {len(att_rows)}\n"
        f"  Reactions:   {len(reaction_rows)}\n"
    )


if __name__ == "__main__":
    count = 100

    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            pass
    generate_static_file(count)