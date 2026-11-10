import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { nowIso, requireTaityo, requireUser } from "../lib/request-context.js";
import { mediaSchema, validateMedia, type MediaItem } from "../lib/media.js";

export function registerInformationalRoutes(app: FastifyInstance): void {
  app.get("/api/informativo", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user?.membership_id || !user.dojotai_id) return;
    const notices = db
      .prepare(
        `SELECT n.id, n.title, n.body, n.media_json, n.created_at, u.full_name, u.username, u.avatar_url
    FROM notices n JOIN users u ON u.id = n.user_id JOIN memberships m ON m.id = n.membership_id
    WHERE m.dojotai_id = ? AND m.status = 'active' ORDER BY n.created_at DESC`,
      )
      .all(user.dojotai_id) as {
      id: string;
      title: string;
      body: string;
      media_json: string;
      created_at: string;
      full_name: string;
      username: string;
      avatar_url: string | null;
    }[];
    const events = db
      .prepare(
        `SELECT e.id, e.title, e.description, e.starts_at, e.location, e.media_json, e.created_at, u.full_name, u.username, u.avatar_url
    FROM events e JOIN users u ON u.id = e.user_id JOIN memberships m ON m.id = e.membership_id
    WHERE m.dojotai_id = ? AND m.status = 'active' ORDER BY e.starts_at ASC`,
      )
      .all(user.dojotai_id) as {
      id: string;
      title: string;
      description: string;
      starts_at: string;
      location: string;
      media_json: string;
      created_at: string;
      full_name: string;
      username: string;
      avatar_url: string | null;
    }[];
    return {
      notices: notices.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        media: JSON.parse(n.media_json),
        createdAt: n.created_at,
        author: {
          fullName: n.full_name,
          username: n.username,
          avatarUrl: n.avatar_url,
        },
      })),
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startsAt: e.starts_at,
        location: e.location,
        media: JSON.parse(e.media_json),
        createdAt: e.created_at,
        author: {
          fullName: e.full_name,
          username: e.username,
          avatarUrl: e.avatar_url,
        },
      })),
    };
  });

  app.post<{ Body: { title: string; body: string; media: MediaItem[] } }>(
    "/api/informativo/notices",
    {
      schema: {
        body: {
          type: "object",
          required: ["title", "body", "media"],
          additionalProperties: false,
          properties: {
            title: { type: "string", minLength: 2, maxLength: 120 },
            body: { type: "string", maxLength: 4000 },
            media: mediaSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const user = requireTaityo(request, reply);
      if (!user?.membership_id) return;
      const body = request.body.body.trim();
      const mediaError = validateMedia(request.body.media);
      if (!body && request.body.media.length === 0)
        return reply
          .code(400)
          .send({ error: "Escreva a mensagem ou anexe uma mídia." });
      if (mediaError) return reply.code(400).send({ error: mediaError });
      const id = randomUUID();
      db.prepare(
        "INSERT INTO notices (id, user_id, membership_id, title, body, media_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        user.id,
        user.membership_id,
        request.body.title.trim(),
        body,
        JSON.stringify(request.body.media),
        nowIso(),
      );
      return reply.code(201).send({ id });
    },
  );

  app.post<{
    Body: {
      title: string;
      description: string;
      startsAt: string;
      location: string;
      media: MediaItem[];
    };
  }>(
    "/api/informativo/events",
    {
      schema: {
        body: {
          type: "object",
          required: ["title", "description", "startsAt", "location", "media"],
          additionalProperties: false,
          properties: {
            title: { type: "string", minLength: 2, maxLength: 120 },
            description: { type: "string", maxLength: 4000 },
            startsAt: { type: "string", format: "date-time" },
            location: { type: "string", maxLength: 200 },
            media: mediaSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id) return;
      const startsAt = new Date(request.body.startsAt);
      if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now())
        return reply
          .code(400)
          .send({ error: "Escolha uma data e horário futuros." });
      const mediaError = validateMedia(request.body.media);
      if (mediaError) return reply.code(400).send({ error: mediaError });
      const id = randomUUID();
      db.prepare(
        "INSERT INTO events (id, user_id, membership_id, title, description, starts_at, location, media_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        user.id,
        user.membership_id,
        request.body.title.trim(),
        request.body.description.trim(),
        startsAt.toISOString(),
        request.body.location.trim(),
        JSON.stringify(request.body.media),
        nowIso(),
      );
      return reply.code(201).send({ id });
    },
  );
}
