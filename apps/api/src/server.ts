import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./security.js";

const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 });
const sessionCookie = "gotai_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 14;
const categories = ["Shonenbu", "Pré-Mahikaritai", "Oficial"] as const;
const roles = ["Fukubuntaityo", "Buntaityo", "Shotaityo", "Fukutaityo", "Taityo", "Shomu"] as const;
const practiceKeys = ["okiyome", "omairi", "leitura", "frequencia_sede"] as const;
type PracticeKey = (typeof practiceKeys)[number];

type UserRow = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  description: string | null;
  avatar_url: string | null;
};

type SessionUser = UserRow & {
  membership_id: string | null;
  dojotai_id: string | null;
  dojotai_name: string | null;
  category: string | null;
  buntai_name: string | null;
  roles: string[];
  latest_request_status: string | null;
};

type CredentialsBody = { email: string; password: string };
type JoinBody = {
  token: string;
  fullName: string;
  username: string;
  birthDate: string;
  email: string;
  phone: string;
  password: string;
  description?: string;
};
type ApprovalBody = { category: (typeof categories)[number]; roles: (typeof roles)[number][]; buntaiId: string };

declare module "fastify" {
  interface FastifyRequest {
    sessionUser: SessionUser | null;
  }
}

app.decorateRequest("sessionUser", null);

await app.register(cookie, { secret: process.env.SESSION_SECRET ?? "local-only-gotai-cookie-secret-change-me" });
await app.register(cors, { origin: "http://localhost:5173", credentials: true });

function nowIso(): string {
  return new Date().toISOString();
}

function getSessionUser(request: FastifyRequest): SessionUser | null {
  const token = request.cookies[sessionCookie];
  if (!token) return null;
  const session = db.prepare(`
    SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?
  `).get(hashToken(token), nowIso()) as { user_id: string } | undefined;
  if (!session) return null;

  const user = db.prepare(`
    SELECT
      u.id, u.full_name, u.username, u.email, u.description, u.avatar_url,
      m.id AS membership_id, m.dojotai_id, d.name AS dojotai_name,
      m.category, b.name AS buntai_name,
      (SELECT status FROM join_requests WHERE user_id = u.id ORDER BY requested_at DESC LIMIT 1) AS latest_request_status
    FROM users u
    LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
    LEFT JOIN dojotais d ON d.id = m.dojotai_id
    LEFT JOIN buntais b ON b.id = m.buntai_id
    WHERE u.id = ?
  `).get(session.user_id) as (Omit<SessionUser, "roles"> & { latest_request_status: string | null }) | undefined;
  if (!user) return null;

  const assignedRoles = user.membership_id
    ? (db.prepare("SELECT role FROM membership_roles WHERE membership_id = ? ORDER BY role").all(user.membership_id) as { role: string }[]).map((row) => row.role)
    : [];
  return { ...user, roles: assignedRoles };
}

app.addHook("preHandler", async (request) => {
  request.sessionUser = getSessionUser(request);
});

function requireUser(request: FastifyRequest, reply: FastifyReply): SessionUser | null {
  if (!request.sessionUser) {
    void reply.code(401).send({ error: "Faça login para continuar." });
    return null;
  }
  return request.sessionUser;
}

function requireTaityo(request: FastifyRequest, reply: FastifyReply): SessionUser | null {
  const user = requireUser(request, reply);
  if (!user) return null;
  if (!user.roles.includes("Taityo")) {
    void reply.code(403).send({ error: "Esta ação exige permissão de Taityo." });
    return null;
  }
  return user;
}

function setSession(reply: FastifyReply, userId: string): void {
  const rawToken = createOpaqueToken();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();
  db.prepare(`INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`)
    .run(randomUUID(), userId, hashToken(rawToken), createdAt, expiresAt);
  reply.setCookie(sessionCookie, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

async function seedLocalTaityo(): Promise<void> {
  const email = process.env.SEED_TAITYO_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_TAITYO_PASSWORD;
  if (!email || !password || process.env.NODE_ENV === "production") return;

  const dojoName = process.env.SEED_DOJOTAI?.trim() || "Campo Grande";
  const createdAt = nowIso();
  let dojo = db.prepare("SELECT id FROM dojotais WHERE name = ?").get(dojoName) as { id: string } | undefined;
  if (!dojo) {
    const id = randomUUID();
    db.prepare("INSERT INTO dojotais (id, name, created_at) VALUES (?, ?, ?)").run(id, dojoName, createdAt);
    dojo = { id };
  }

  let user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
  if (!user) {
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    db.prepare(`
      INSERT INTO users (id, full_name, username, birth_date, email, phone, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, "Taityo local", "taityo", "1990-01-01", email, "0000000000", passwordHash, createdAt);
    user = { id: userId };
  }

  const membership = db.prepare("SELECT id FROM memberships WHERE user_id = ? AND status = 'active'").get(user.id) as { id: string } | undefined;
  if (!membership) {
    const membershipId = randomUUID();
    const transaction = db.transaction(() => {
      db.prepare(`INSERT INTO memberships (id, user_id, dojotai_id, category, status, joined_at) VALUES (?, ?, ?, 'Oficial', 'active', ?)`)
        .run(membershipId, user!.id, dojo!.id, createdAt);
      db.prepare("INSERT INTO membership_roles (membership_id, role) VALUES (?, 'Taityo')").run(membershipId);
    });
    transaction();
  }
}

await seedLocalTaityo();

app.get("/api/health", async () => ({ status: "ok", service: "gotai-api" }));

function localDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Campo_Grande", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function validPracticeDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const daysAgo = (Date.parse(`${today}T12:00:00Z`) - parsed.getTime()) / 86400000;
  return Number.isInteger(daysAgo) && daysAgo >= 0 && daysAgo <= 2;
}

app.get("/api/me/practices", async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user?.membership_id) return;
  const rows = db.prepare("SELECT practice_key, practice_date FROM practice_logs WHERE membership_id = ? ORDER BY practice_date DESC")
    .all(user.membership_id) as { practice_key: PracticeKey; practice_date: string }[];
  return { today: localDateString(), logs: rows.map((row) => ({ practiceKey: row.practice_key, date: row.practice_date })) };
});

app.post<{ Body: { practiceKey: PracticeKey; date: string; performed: boolean } }>("/api/me/practices", {
  schema: { body: { type: "object", required: ["practiceKey", "date", "performed"], additionalProperties: false, properties: {
    practiceKey: { type: "string", enum: [...practiceKeys] }, date: { type: "string", format: "date" }, performed: { type: "boolean" },
  } } },
}, async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user?.membership_id) return;
  const today = localDateString();
  if (!validPracticeDate(request.body.date, today)) return reply.code(400).send({ error: "Você pode registrar ou corrigir práticas de hoje e dos dois dias anteriores." });
  if (request.body.performed) {
    const timestamp = nowIso();
    db.prepare(`INSERT INTO practice_logs (id, user_id, membership_id, practice_key, practice_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(membership_id, practice_key, practice_date) DO UPDATE SET updated_at = excluded.updated_at`)
      .run(randomUUID(), user.id, user.membership_id, request.body.practiceKey, request.body.date, timestamp, timestamp);
  } else {
    db.prepare("DELETE FROM practice_logs WHERE membership_id = ? AND practice_key = ? AND practice_date = ?")
      .run(user.membership_id, request.body.practiceKey, request.body.date);
  }
  return { ok: true };
});

app.put<{ Body: { fullName: string; username: string; description: string; avatarDataUrl: string | null } }>("/api/me/profile", {
  schema: { body: { type: "object", required: ["fullName", "username", "description", "avatarDataUrl"], additionalProperties: false, properties: {
    fullName: { type: "string", minLength: 2, maxLength: 120 }, username: { type: "string", minLength: 3, maxLength: 24, pattern: "^[a-zA-Z0-9_.]+$" },
    description: { type: "string", maxLength: 280 }, avatarDataUrl: { anyOf: [{ type: "string", maxLength: 1500000 }, { type: "null" }] },
  } } },
}, async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user?.membership_id) return;
  const username = request.body.username.trim().toLowerCase();
  if (db.prepare("SELECT 1 FROM users WHERE username = ? AND id != ?").get(username, user.id)) {
    return reply.code(409).send({ error: "Esse username já está em uso." });
  }
  if (request.body.avatarDataUrl && !/^data:image\/(png|jpeg|webp);base64,/.test(request.body.avatarDataUrl)) {
    return reply.code(400).send({ error: "Escolha uma imagem PNG, JPEG ou WebP para a foto." });
  }
  db.prepare("UPDATE users SET full_name = ?, username = ?, description = ?, avatar_url = ? WHERE id = ?")
    .run(request.body.fullName.trim(), username, request.body.description.trim() || null, request.body.avatarDataUrl, user.id);
  return { ok: true };
});

type MediaItem = { kind: "image" | "audio" | "video"; dataUrl: string };
const mediaSchema = { type: "array", maxItems: 4, items: { type: "object", required: ["kind", "dataUrl"], additionalProperties: false, properties: {
  kind: { type: "string", enum: ["image", "audio", "video"] }, dataUrl: { type: "string", minLength: 30, maxLength: 7000000 },
} } } as const;

app.get("/api/social/posts", async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user?.membership_id) return;
  const rows = db.prepare(`SELECT p.id, p.body, p.media_json, p.created_at, u.full_name, u.username, u.avatar_url
    FROM social_posts p JOIN users u ON u.id = p.user_id WHERE p.membership_id = ? ORDER BY p.created_at DESC`)
    .all(user.membership_id) as { id: string; body: string; media_json: string; created_at: string; full_name: string; username: string; avatar_url: string | null }[];
  return { posts: rows.map((row) => ({ id: row.id, body: row.body, media: JSON.parse(row.media_json), createdAt: row.created_at, author: { fullName: row.full_name, username: row.username, avatarUrl: row.avatar_url } })) };
});

app.post<{ Body: { body: string; media: MediaItem[] } }>("/api/social/posts", {
  schema: { body: { type: "object", required: ["body", "media"], additionalProperties: false, properties: { body: { type: "string", maxLength: 2000 }, media: mediaSchema } } },
}, async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user?.membership_id) return;
  const body = request.body.body.trim();
  const media = request.body.media;
  if (!body && media.length === 0) return reply.code(400).send({ error: "Escreva algo ou anexe uma mídia para publicar." });
  let total = 0;
  for (const item of media) {
    const match = item.dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match || (item.kind === "image" && !match[1].startsWith("image/")) || (item.kind === "audio" && !match[1].startsWith("audio/")) || (item.kind === "video" && !match[1].startsWith("video/"))) {
      return reply.code(400).send({ error: "Um dos arquivos não corresponde ao tipo de mídia selecionado." });
    }
    total += Buffer.from(match[2], "base64").byteLength;
  }
  if (total > 5 * 1024 * 1024) return reply.code(413).send({ error: "O total de mídias da publicação deve ter até 5 MB." });
  const id = randomUUID();
  db.prepare("INSERT INTO social_posts (id, user_id, membership_id, body, media_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, user.id, user.membership_id, body, JSON.stringify(media), nowIso());
  return reply.code(201).send({ id });
});

app.get("/api/informativo", async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user?.membership_id) return;
  const notices = db.prepare(`SELECT n.id, n.title, n.body, n.created_at, u.full_name, u.username
    FROM notices n JOIN users u ON u.id = n.user_id WHERE n.membership_id = ? ORDER BY n.created_at DESC`)
    .all(user.membership_id) as { id: string; title: string; body: string; created_at: string; full_name: string; username: string }[];
  const events = db.prepare(`SELECT e.id, e.title, e.description, e.starts_at, e.location, e.created_at, u.full_name, u.username
    FROM events e JOIN users u ON u.id = e.user_id WHERE e.membership_id = ? ORDER BY e.starts_at ASC`)
    .all(user.membership_id) as { id: string; title: string; description: string; starts_at: string; location: string; created_at: string; full_name: string; username: string }[];
  return { notices: notices.map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.created_at, author: { fullName: n.full_name, username: n.username } })), events: events.map((e) => ({ id: e.id, title: e.title, description: e.description, startsAt: e.starts_at, location: e.location, createdAt: e.created_at, author: { fullName: e.full_name, username: e.username } })) };
});

app.post<{ Body: { title: string; body: string } }>("/api/informativo/notices", {
  schema: { body: { type: "object", required: ["title", "body"], additionalProperties: false, properties: { title: { type: "string", minLength: 2, maxLength: 120 }, body: { type: "string", minLength: 1, maxLength: 4000 } } } },
}, async (request, reply) => {
  const user = requireTaityo(request, reply);
  if (!user?.membership_id) return;
  const id = randomUUID();
  db.prepare("INSERT INTO notices (id, user_id, membership_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, user.id, user.membership_id, request.body.title.trim(), request.body.body.trim(), nowIso());
  return reply.code(201).send({ id });
});

app.post<{ Body: { title: string; description: string; startsAt: string; location: string } }>("/api/informativo/events", {
  schema: { body: { type: "object", required: ["title", "description", "startsAt", "location"], additionalProperties: false, properties: {
    title: { type: "string", minLength: 2, maxLength: 120 }, description: { type: "string", maxLength: 4000 }, startsAt: { type: "string", format: "date-time" }, location: { type: "string", maxLength: 200 },
  } } },
}, async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user?.membership_id) return;
  const startsAt = new Date(request.body.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) return reply.code(400).send({ error: "Escolha uma data e horário futuros." });
  const id = randomUUID();
  db.prepare("INSERT INTO events (id, user_id, membership_id, title, description, starts_at, location, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, user.id, user.membership_id, request.body.title.trim(), request.body.description.trim(), startsAt.toISOString(), request.body.location.trim(), nowIso());
  return reply.code(201).send({ id });
});

app.get<{ Params: { token: string } }>("/api/invitations/:token", async (request, reply) => {
  const invite = db.prepare(`
    SELECT i.expires_at, i.consumed_at, d.name AS dojotai_name
    FROM invitations i JOIN dojotais d ON d.id = i.dojotai_id
    WHERE i.token_hash = ?
  `).get(hashToken(request.params.token)) as { expires_at: string; consumed_at: string | null; dojotai_name: string } | undefined;
  if (!invite || invite.consumed_at || invite.expires_at <= nowIso()) {
    return reply.code(404).send({ error: "Este convite não está disponível." });
  }
  return { valid: true, dojotaiName: invite.dojotai_name, expiresAt: invite.expires_at };
});

app.post<{ Body: JoinBody }>("/api/join-requests", {
  schema: {
    body: {
      type: "object",
      required: ["token", "fullName", "username", "birthDate", "email", "phone", "password"],
      additionalProperties: false,
      properties: {
        token: { type: "string", minLength: 20, maxLength: 128 },
        fullName: { type: "string", minLength: 2, maxLength: 120 },
        username: { type: "string", minLength: 3, maxLength: 24, pattern: "^[a-zA-Z0-9_.]+$" },
        birthDate: { type: "string", format: "date" },
        email: { type: "string", format: "email", maxLength: 254 },
        phone: { type: "string", minLength: 8, maxLength: 24 },
        password: { type: "string", minLength: 8, maxLength: 128 },
        description: { type: "string", maxLength: 280 },
      },
    },
  },
}, async (request, reply) => {
  const body = request.body;
  const email = body.email.trim().toLowerCase();
  const username = body.username.trim().toLowerCase();
  const passwordHash = await hashPassword(body.password);
  const rawSession = createOpaqueToken();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();
  const invitation = db.prepare(`SELECT id, dojotai_id, expires_at, consumed_at FROM invitations WHERE token_hash = ?`)
    .get(hashToken(body.token)) as { id: string; dojotai_id: string; expires_at: string; consumed_at: string | null } | undefined;
  if (!invitation || invitation.consumed_at || invitation.expires_at <= createdAt) {
    return reply.code(400).send({ error: "Este convite não está disponível." });
  }
  if (db.prepare("SELECT 1 FROM users WHERE email = ? OR username = ?").get(email, username)) {
    return reply.code(409).send({ error: "E-mail ou username já cadastrado." });
  }

  const userId = randomUUID();
  const requestId = randomUUID();
  try {
    const transaction = db.transaction(() => {
      const consumed = db.prepare(`UPDATE invitations SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`)
        .run(createdAt, invitation.id, createdAt);
      if (consumed.changes !== 1) throw new Error("INVITATION_UNAVAILABLE");
      db.prepare(`
        INSERT INTO users (id, full_name, username, birth_date, email, phone, password_hash, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, body.fullName.trim(), username, body.birthDate, email, body.phone.trim(), passwordHash, body.description?.trim() || null, createdAt);
      db.prepare(`
        INSERT INTO join_requests (id, user_id, dojotai_id, invitation_id, status, requested_at, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `).run(requestId, userId, invitation.dojotai_id, invitation.id, createdAt, createdAt);
      db.prepare(`INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`)
        .run(randomUUID(), userId, hashToken(rawSession), createdAt, expiresAt);
    });
    transaction();
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_UNAVAILABLE") {
      return reply.code(400).send({ error: "Este convite já foi usado ou expirou." });
    }
    if (typeof error === "object" && error !== null && "code" in error && String(error.code).startsWith("SQLITE_CONSTRAINT_UNIQUE")) {
      return reply.code(409).send({ error: "E-mail ou username já cadastrado." });
    }
    throw error;
  }

  reply.setCookie(sessionCookie, rawSession, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
  return reply.code(201).send({ status: "pending", requestId });
});

app.post<{ Body: { token: string } }>("/api/join-requests/retry", {
  schema: {
    body: {
      type: "object",
      required: ["token"],
      additionalProperties: false,
      properties: { token: { type: "string", minLength: 20, maxLength: 128 } },
    },
  },
}, async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user) return;
  if (user.membership_id) return reply.code(409).send({ error: "Você já pertence a um Dojotai. A mudança de sede deve seguir o fluxo de transferência." });
  if (user.latest_request_status !== "rejected") return reply.code(409).send({ error: "Não há uma solicitação recusada disponível para reenviar." });

  const createdAt = nowIso();
  const invitation = db.prepare(`SELECT id, dojotai_id, expires_at, consumed_at FROM invitations WHERE token_hash = ?`)
    .get(hashToken(request.body.token)) as { id: string; dojotai_id: string; expires_at: string; consumed_at: string | null } | undefined;
  if (!invitation || invitation.consumed_at || invitation.expires_at <= createdAt) {
    return reply.code(400).send({ error: "Este convite não está disponível." });
  }

  const requestId = randomUUID();
  try {
    const transaction = db.transaction(() => {
      const consumed = db.prepare(`UPDATE invitations SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`)
        .run(createdAt, invitation.id, createdAt);
      if (consumed.changes !== 1) throw new Error("INVITATION_UNAVAILABLE");
      db.prepare(`
        INSERT INTO join_requests (id, user_id, dojotai_id, invitation_id, status, requested_at, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `).run(requestId, user.id, invitation.dojotai_id, invitation.id, createdAt, createdAt);
    });
    transaction();
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_UNAVAILABLE") {
      return reply.code(400).send({ error: "Este convite já foi usado ou expirou." });
    }
    throw error;
  }
  return reply.code(201).send({ status: "pending", requestId });
});

app.post<{ Body: CredentialsBody }>("/api/auth/login", {
  schema: {
    body: {
      type: "object",
      required: ["email", "password"],
      additionalProperties: false,
      properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 1, maxLength: 128 } },
    },
  },
}, async (request, reply) => {
  const email = request.body.email.trim().toLowerCase();
  const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as { id: string; password_hash: string } | undefined;
  if (!user || !(await verifyPassword(request.body.password, user.password_hash))) {
    return reply.code(401).send({ error: "E-mail ou senha incorretos." });
  }
  setSession(reply, user.id);
  return { ok: true };
});

app.post("/api/auth/logout", async (request, reply) => {
  const token = request.cookies[sessionCookie];
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  reply.clearCookie(sessionCookie, { path: "/" });
  return { ok: true };
});

app.get("/api/auth/me", async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user) return;
  return {
    user: { id: user.id, fullName: user.full_name, username: user.username, email: user.email, description: user.description, avatarUrl: user.avatar_url },
    membership: user.membership_id ? {
      dojotaiId: user.dojotai_id,
      dojotaiName: user.dojotai_name,
      category: user.category,
      buntaiName: user.buntai_name,
      roles: user.roles,
    } : null,
    latestRequestStatus: user.latest_request_status,
  };
});

app.post("/api/admin/invitations", async (request, reply) => {
  const admin = requireTaityo(request, reply);
  if (!admin || !admin.dojotai_id) return;
  const token = createOpaqueToken();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO invitations (id, token_hash, dojotai_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), hashToken(token), admin.dojotai_id, admin.id, createdAt, expiresAt);
  return reply.code(201).send({ token, expiresAt });
});

app.get("/api/admin/join-requests", async (request, reply) => {
  const admin = requireTaityo(request, reply);
  if (!admin || !admin.dojotai_id) return;
  const requests = db.prepare(`
    SELECT r.id, r.requested_at, u.full_name, u.username, u.birth_date, u.email, u.phone, u.description
    FROM join_requests r JOIN users u ON u.id = r.user_id
    WHERE r.dojotai_id = ? AND r.status = 'pending'
    ORDER BY r.requested_at ASC
  `).all(admin.dojotai_id);
  const buntais = db.prepare("SELECT id, name FROM buntais WHERE dojotai_id = ? ORDER BY name").all(admin.dojotai_id);
  return { requests, buntais, categories, roles };
});

app.post<{ Body: { name: string } }>("/api/admin/buntais", {
  schema: {
    body: {
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: { name: { type: "string", minLength: 2, maxLength: 80 } },
    },
  },
}, async (request, reply) => {
  const admin = requireTaityo(request, reply);
  if (!admin?.dojotai_id) return;
  const name = request.body.name.trim();
  try {
    const id = randomUUID();
    db.prepare("INSERT INTO buntais (id, dojotai_id, name) VALUES (?, ?, ?)").run(id, admin.dojotai_id, name);
    return reply.code(201).send({ id, name });
  } catch {
    return reply.code(409).send({ error: "Já existe um Buntai com esse nome." });
  }
});

app.post<{ Params: { requestId: string }; Body: ApprovalBody }>("/api/admin/join-requests/:requestId/approve", {
  schema: {
    body: {
      type: "object",
      required: ["category", "roles", "buntaiId"],
      additionalProperties: false,
      properties: {
        category: { type: "string", enum: [...categories] },
        roles: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", enum: [...roles] } },
        buntaiId: { type: "string", format: "uuid" },
      },
    },
  },
}, async (request, reply) => {
  const admin = requireTaityo(request, reply);
  if (!admin || !admin.dojotai_id) return;
  const { requestId } = request.params;
  const pending = db.prepare("SELECT id, user_id, dojotai_id FROM join_requests WHERE id = ? AND status = 'pending'")
    .get(requestId) as { id: string; user_id: string; dojotai_id: string } | undefined;
  if (!pending || pending.dojotai_id !== admin.dojotai_id) return reply.code(404).send({ error: "Solicitação pendente não encontrada." });
  if (request.body.buntaiId) {
    const buntai = db.prepare("SELECT 1 FROM buntais WHERE id = ? AND dojotai_id = ?").get(request.body.buntaiId, admin.dojotai_id);
    if (!buntai) return reply.code(400).send({ error: "O Buntai escolhido não pertence a este Dojotai." });
  }

  const membershipId = randomUUID();
  const decidedAt = nowIso();
  try {
    const transaction = db.transaction(() => {
      const changed = db.prepare(`UPDATE join_requests SET status = 'approved', decided_at = ?, decided_by = ?, category = ? WHERE id = ? AND status = 'pending'`)
        .run(decidedAt, admin.id, request.body.category, requestId);
      if (changed.changes !== 1) throw new Error("REQUEST_ALREADY_DECIDED");
      db.prepare(`INSERT INTO memberships (id, user_id, dojotai_id, category, buntai_id, status, joined_at) VALUES (?, ?, ?, ?, ?, 'active', ?)`)
        .run(membershipId, pending.user_id, pending.dojotai_id, request.body.category, request.body.buntaiId ?? null, decidedAt);
      const insertRole = db.prepare("INSERT INTO membership_roles (membership_id, role) VALUES (?, ?)");
      for (const role of request.body.roles) insertRole.run(membershipId, role);
    });
    transaction();
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_ALREADY_DECIDED") {
      return reply.code(409).send({ error: "A solicitação já foi decidida." });
    }
    throw error;
  }
  return { status: "approved" };
});

app.post<{ Params: { requestId: string } }>("/api/admin/join-requests/:requestId/reject", async (request, reply) => {
  const admin = requireTaityo(request, reply);
  if (!admin || !admin.dojotai_id) return;
  const result = db.prepare(`
    UPDATE join_requests SET status = 'rejected', decided_at = ?, decided_by = ?
    WHERE id = ? AND dojotai_id = ? AND status = 'pending'
  `).run(nowIso(), admin.id, request.params.requestId, admin.dojotai_id);
  if (result.changes !== 1) return reply.code(404).send({ error: "Solicitação pendente não encontrada." });
  return { status: "rejected" };
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  if (typeof error === "object" && error !== null && "validation" in error && error.validation) {
    return reply.code(400).send({ error: "Confira os dados informados." });
  }
  return reply.code(500).send({ error: "Ocorreu um erro inesperado." });
});

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
await app.listen({ port, host });
