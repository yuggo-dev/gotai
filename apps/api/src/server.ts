import "dotenv/config";
import Fastify, { type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { hashPassword, hashToken } from "./security.js";
import { nowIso, type SessionUser } from "./lib/request-context.js";
import { registerIdentityRoutes } from "./routes/identity.js";
import { registerPracticesProfileRoutes } from "./routes/practices-profile.js";
import { registerSocialRoutes } from "./routes/social.js";
import { registerInformationalRoutes } from "./routes/informational.js";
import { registerOrganogramRoutes } from "./routes/organogram.js";

const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 });
const sessionCookie = "gotai_session";

await app.register(cookie, {
  secret:
    process.env.SESSION_SECRET ?? "local-only-gotai-cookie-secret-change-me",
});
await app.register(cors, {
  origin: "http://localhost:5173",
  credentials: true,
});
app.decorateRequest("sessionUser", null);

function getSessionUser(request: FastifyRequest): SessionUser | null {
  const token = request.cookies[sessionCookie];
  if (!token) return null;
  const session = db
    .prepare(
      `
    SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?
  `,
    )
    .get(hashToken(token), nowIso()) as { user_id: string } | undefined;
  if (!session) return null;

  const user = db
    .prepare(
      `
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
  `,
    )
    .get(session.user_id) as
    | (Omit<SessionUser, "roles"> & { latest_request_status: string | null })
    | undefined;
  if (!user) return null;

  const assignedRoles = user.membership_id
    ? (
        db
          .prepare(
            "SELECT role FROM membership_roles WHERE membership_id = ? ORDER BY role",
          )
          .all(user.membership_id) as { role: string }[]
      ).map((row) => row.role)
    : [];
  return { ...user, roles: assignedRoles };
}

app.addHook("preHandler", async (request: FastifyRequest) => {
  request.sessionUser = getSessionUser(request);
});

async function seedLocalTaityo(): Promise<void> {
  const email = process.env.SEED_TAITYO_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_TAITYO_PASSWORD;
  if (!email || !password || process.env.NODE_ENV === "production") return;

  const dojoName = process.env.SEED_DOJOTAI?.trim() || "Campo Grande";
  const createdAt = nowIso();
  let dojo = db
    .prepare("SELECT id FROM dojotais WHERE name = ?")
    .get(dojoName) as { id: string } | undefined;
  if (!dojo) {
    const id = randomUUID();
    db.prepare(
      "INSERT INTO dojotais (id, name, created_at) VALUES (?, ?, ?)",
    ).run(id, dojoName, createdAt);
    dojo = { id };
  }

  let user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
    { id: string } | undefined;
  if (!user) {
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    db.prepare(
      `
      INSERT INTO users (id, full_name, username, birth_date, email, phone, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      userId,
      "Taityo local",
      "taityo",
      "1990-01-01",
      email,
      "0000000000",
      passwordHash,
      createdAt,
    );
    user = { id: userId };
  }

  const membership = db
    .prepare(
      "SELECT id FROM memberships WHERE user_id = ? AND status = 'active'",
    )
    .get(user.id) as { id: string } | undefined;
  if (!membership) {
    const membershipId = randomUUID();
    const transaction = db.transaction(() => {
      db.prepare(
        `INSERT INTO memberships (id, user_id, dojotai_id, category, status, joined_at) VALUES (?, ?, ?, 'Oficial', 'active', ?)`,
      ).run(membershipId, user!.id, dojo!.id, createdAt);
      db.prepare(
        "INSERT INTO membership_roles (membership_id, role) VALUES (?, 'Taityo')",
      ).run(membershipId);
    });
    transaction();
  }
}

await seedLocalTaityo();

app.get("/api/health", async () => ({ status: "ok", service: "gotai-api" }));
registerIdentityRoutes(app);
registerPracticesProfileRoutes(app);
registerSocialRoutes(app);
registerInformationalRoutes(app);
registerOrganogramRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  if (
    typeof error === "object" &&
    error !== null &&
    "validation" in error &&
    error.validation
  ) {
    return reply.code(400).send({ error: "Confira os dados informados." });
  }
  return reply.code(500).send({ error: "Ocorreu um erro inesperado." });
});

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
await app.listen({ port, host });
