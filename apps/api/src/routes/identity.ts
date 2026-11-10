import type { FastifyInstance, FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../security.js";
import {
  categories,
  nowIso,
  requireTaityo,
  requireUser,
  roles,
} from "../lib/request-context.js";

const sessionCookie = "gotai_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 14;
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
type ApprovalBody = {
  category: (typeof categories)[number];
  roles: (typeof roles)[number][];
  buntaiId: string;
};

function setSession(reply: FastifyReply, userId: string): void {
  const rawToken = createOpaqueToken();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(randomUUID(), userId, hashToken(rawToken), createdAt, expiresAt);
  reply.setCookie(sessionCookie, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function registerIdentityRoutes(app: FastifyInstance): void {
  app.get<{ Params: { token: string } }>(
    "/api/invitations/:token",
    async (request, reply) => {
      const invite = db
        .prepare(
          `
    SELECT i.expires_at, i.consumed_at, d.name AS dojotai_name
    FROM invitations i JOIN dojotais d ON d.id = i.dojotai_id
    WHERE i.token_hash = ?
  `,
        )
        .get(hashToken(request.params.token)) as
        | {
            expires_at: string;
            consumed_at: string | null;
            dojotai_name: string;
          }
        | undefined;
      if (!invite || invite.consumed_at || invite.expires_at <= nowIso()) {
        return reply
          .code(404)
          .send({ error: "Este convite não está disponível." });
      }
      return {
        valid: true,
        dojotaiName: invite.dojotai_name,
        expiresAt: invite.expires_at,
      };
    },
  );

  app.post<{ Body: JoinBody }>(
    "/api/join-requests",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "token",
            "fullName",
            "username",
            "birthDate",
            "email",
            "phone",
            "password",
          ],
          additionalProperties: false,
          properties: {
            token: { type: "string", minLength: 20, maxLength: 128 },
            fullName: { type: "string", minLength: 2, maxLength: 120 },
            username: {
              type: "string",
              minLength: 3,
              maxLength: 24,
              pattern: "^[a-zA-Z0-9_.]+$",
            },
            birthDate: { type: "string", format: "date" },
            email: { type: "string", format: "email", maxLength: 254 },
            phone: { type: "string", minLength: 8, maxLength: 24 },
            password: { type: "string", minLength: 8, maxLength: 128 },
            description: { type: "string", maxLength: 280 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const email = body.email.trim().toLowerCase();
      const username = body.username.trim().toLowerCase();
      const passwordHash = await hashPassword(body.password);
      const rawSession = createOpaqueToken();
      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();
      const invitation = db
        .prepare(
          `SELECT id, dojotai_id, expires_at, consumed_at FROM invitations WHERE token_hash = ?`,
        )
        .get(hashToken(body.token)) as
        | {
            id: string;
            dojotai_id: string;
            expires_at: string;
            consumed_at: string | null;
          }
        | undefined;
      if (
        !invitation ||
        invitation.consumed_at ||
        invitation.expires_at <= createdAt
      ) {
        return reply
          .code(400)
          .send({ error: "Este convite não está disponível." });
      }
      if (
        db
          .prepare("SELECT 1 FROM users WHERE email = ? OR username = ?")
          .get(email, username)
      ) {
        return reply
          .code(409)
          .send({ error: "E-mail ou username já cadastrado." });
      }

      const userId = randomUUID();
      const requestId = randomUUID();
      try {
        const transaction = db.transaction(() => {
          const consumed = db
            .prepare(
              `UPDATE invitations SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`,
            )
            .run(createdAt, invitation.id, createdAt);
          if (consumed.changes !== 1) throw new Error("INVITATION_UNAVAILABLE");
          db.prepare(
            `
        INSERT INTO users (id, full_name, username, birth_date, email, phone, password_hash, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
          ).run(
            userId,
            body.fullName.trim(),
            username,
            body.birthDate,
            email,
            body.phone.trim(),
            passwordHash,
            body.description?.trim() || null,
            createdAt,
          );
          db.prepare(
            `
        INSERT INTO join_requests (id, user_id, dojotai_id, invitation_id, status, requested_at, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `,
          ).run(
            requestId,
            userId,
            invitation.dojotai_id,
            invitation.id,
            createdAt,
            createdAt,
          );
          db.prepare(
            `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
          ).run(
            randomUUID(),
            userId,
            hashToken(rawSession),
            createdAt,
            expiresAt,
          );
        });
        transaction();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "INVITATION_UNAVAILABLE"
        ) {
          return reply
            .code(400)
            .send({ error: "Este convite já foi usado ou expirou." });
        }
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          String(error.code).startsWith("SQLITE_CONSTRAINT_UNIQUE")
        ) {
          return reply
            .code(409)
            .send({ error: "E-mail ou username já cadastrado." });
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
    },
  );

  app.post<{ Body: { token: string } }>(
    "/api/join-requests/retry",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          additionalProperties: false,
          properties: {
            token: { type: "string", minLength: 20, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user) return;
      if (user.membership_id)
        return reply
          .code(409)
          .send({
            error:
              "Você já pertence a um Dojotai. A mudança de sede deve seguir o fluxo de transferência.",
          });
      if (user.latest_request_status !== "rejected")
        return reply
          .code(409)
          .send({
            error: "Não há uma solicitação recusada disponível para reenviar.",
          });

      const createdAt = nowIso();
      const invitation = db
        .prepare(
          `SELECT id, dojotai_id, expires_at, consumed_at FROM invitations WHERE token_hash = ?`,
        )
        .get(hashToken(request.body.token)) as
        | {
            id: string;
            dojotai_id: string;
            expires_at: string;
            consumed_at: string | null;
          }
        | undefined;
      if (
        !invitation ||
        invitation.consumed_at ||
        invitation.expires_at <= createdAt
      ) {
        return reply
          .code(400)
          .send({ error: "Este convite não está disponível." });
      }

      const requestId = randomUUID();
      try {
        const transaction = db.transaction(() => {
          const consumed = db
            .prepare(
              `UPDATE invitations SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`,
            )
            .run(createdAt, invitation.id, createdAt);
          if (consumed.changes !== 1) throw new Error("INVITATION_UNAVAILABLE");
          db.prepare(
            `
        INSERT INTO join_requests (id, user_id, dojotai_id, invitation_id, status, requested_at, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `,
          ).run(
            requestId,
            user.id,
            invitation.dojotai_id,
            invitation.id,
            createdAt,
            createdAt,
          );
        });
        transaction();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "INVITATION_UNAVAILABLE"
        ) {
          return reply
            .code(400)
            .send({ error: "Este convite já foi usado ou expirou." });
        }
        throw error;
      }
      return reply.code(201).send({ status: "pending", requestId });
    },
  );

  app.post<{ Body: CredentialsBody }>(
    "/api/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();
      const user = db
        .prepare("SELECT id, password_hash FROM users WHERE email = ?")
        .get(email) as { id: string; password_hash: string } | undefined;
      if (
        !user ||
        !(await verifyPassword(request.body.password, user.password_hash))
      ) {
        return reply.code(401).send({ error: "E-mail ou senha incorretos." });
      }
      setSession(reply, user.id);
      return { ok: true };
    },
  );

  app.post("/api/auth/logout", async (request, reply) => {
    const token = request.cookies[sessionCookie];
    if (token)
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
        hashToken(token),
      );
    reply.clearCookie(sessionCookie, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        description: user.description,
        avatarUrl: user.avatar_url,
      },
      membership: user.membership_id
        ? {
            dojotaiId: user.dojotai_id,
            dojotaiName: user.dojotai_name,
            category: user.category,
            buntaiName: user.buntai_name,
            roles: user.roles,
          }
        : null,
      latestRequestStatus: user.latest_request_status,
    };
  });

  app.post("/api/admin/invitations", async (request, reply) => {
    const admin = requireTaityo(request, reply);
    if (!admin || !admin.dojotai_id) return;
    const token = createOpaqueToken();
    const createdAt = nowIso();
    const expiresAt = new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000,
    ).toISOString();
    db.prepare(
      `INSERT INTO invitations (id, token_hash, dojotai_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      hashToken(token),
      admin.dojotai_id,
      admin.id,
      createdAt,
      expiresAt,
    );
    return reply.code(201).send({ token, expiresAt });
  });

  app.get("/api/admin/join-requests", async (request, reply) => {
    const admin = requireTaityo(request, reply);
    if (!admin || !admin.dojotai_id) return;
    const requests = db
      .prepare(
        `
    SELECT r.id, r.requested_at, u.full_name, u.username, u.birth_date, u.email, u.phone, u.description
    FROM join_requests r JOIN users u ON u.id = r.user_id
    WHERE r.dojotai_id = ? AND r.status = 'pending'
    ORDER BY r.requested_at ASC
  `,
      )
      .all(admin.dojotai_id);
    const buntais = db
      .prepare(
        "SELECT id, name FROM buntais WHERE dojotai_id = ? ORDER BY name",
      )
      .all(admin.dojotai_id);
    return { requests, buntais, categories, roles };
  });

  app.post<{ Body: { name: string } }>(
    "/api/admin/buntais",
    {
      schema: {
        body: {
          type: "object",
          required: ["name"],
          additionalProperties: false,
          properties: { name: { type: "string", minLength: 2, maxLength: 80 } },
        },
      },
    },
    async (request, reply) => {
      const admin = requireTaityo(request, reply);
      if (!admin?.dojotai_id) return;
      const name = request.body.name.trim();
      try {
        const id = randomUUID();
        db.prepare(
          "INSERT INTO buntais (id, dojotai_id, name) VALUES (?, ?, ?)",
        ).run(id, admin.dojotai_id, name);
        return reply.code(201).send({ id, name });
      } catch {
        return reply
          .code(409)
          .send({ error: "Já existe um Buntai com esse nome." });
      }
    },
  );

  app.post<{ Params: { requestId: string }; Body: ApprovalBody }>(
    "/api/admin/join-requests/:requestId/approve",
    {
      schema: {
        body: {
          type: "object",
          required: ["category", "roles", "buntaiId"],
          additionalProperties: false,
          properties: {
            category: { type: "string", enum: [...categories] },
            roles: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { type: "string", enum: [...roles] },
            },
            buntaiId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    async (request, reply) => {
      const admin = requireTaityo(request, reply);
      if (!admin || !admin.dojotai_id) return;
      const { requestId } = request.params;
      const pending = db
        .prepare(
          "SELECT id, user_id, dojotai_id FROM join_requests WHERE id = ? AND status = 'pending'",
        )
        .get(requestId) as
        { id: string; user_id: string; dojotai_id: string } | undefined;
      if (!pending || pending.dojotai_id !== admin.dojotai_id)
        return reply
          .code(404)
          .send({ error: "Solicitação pendente não encontrada." });
      if (request.body.buntaiId) {
        const buntai = db
          .prepare("SELECT 1 FROM buntais WHERE id = ? AND dojotai_id = ?")
          .get(request.body.buntaiId, admin.dojotai_id);
        if (!buntai)
          return reply
            .code(400)
            .send({ error: "O Buntai escolhido não pertence a este Dojotai." });
      }

      const membershipId = randomUUID();
      const decidedAt = nowIso();
      try {
        const transaction = db.transaction(() => {
          const changed = db
            .prepare(
              `UPDATE join_requests SET status = 'approved', decided_at = ?, decided_by = ?, category = ? WHERE id = ? AND status = 'pending'`,
            )
            .run(decidedAt, admin.id, request.body.category, requestId);
          if (changed.changes !== 1) throw new Error("REQUEST_ALREADY_DECIDED");
          db.prepare(
            `INSERT INTO memberships (id, user_id, dojotai_id, category, buntai_id, status, joined_at) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
          ).run(
            membershipId,
            pending.user_id,
            pending.dojotai_id,
            request.body.category,
            request.body.buntaiId ?? null,
            decidedAt,
          );
          const insertRole = db.prepare(
            "INSERT INTO membership_roles (membership_id, role) VALUES (?, ?)",
          );
          for (const role of request.body.roles)
            insertRole.run(membershipId, role);
        });
        transaction();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "REQUEST_ALREADY_DECIDED"
        ) {
          return reply
            .code(409)
            .send({ error: "A solicitação já foi decidida." });
        }
        throw error;
      }
      return { status: "approved" };
    },
  );

  app.post<{ Params: { requestId: string } }>(
    "/api/admin/join-requests/:requestId/reject",
    async (request, reply) => {
      const admin = requireTaityo(request, reply);
      if (!admin || !admin.dojotai_id) return;
      const result = db
        .prepare(
          `
    UPDATE join_requests SET status = 'rejected', decided_at = ?, decided_by = ?
    WHERE id = ? AND dojotai_id = ? AND status = 'pending'
  `,
        )
        .run(nowIso(), admin.id, request.params.requestId, admin.dojotai_id);
      if (result.changes !== 1)
        return reply
          .code(404)
          .send({ error: "Solicitação pendente não encontrada." });
      return { status: "rejected" };
    },
  );
}
