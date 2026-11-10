import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { nowIso, requireUser } from "../lib/request-context.js";
import { mediaSchema, validateMedia, type MediaItem } from "../lib/media.js";

export function registerSocialRoutes(app: FastifyInstance): void {
  app.get("/api/social/posts", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user?.membership_id || !user.dojotai_id) return;
    const rows = db
      .prepare(
        `SELECT p.id, p.body, p.media_json, p.created_at, u.id AS author_id, u.full_name, u.username, u.avatar_url,
      (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS likes_count,
      EXISTS(SELECT 1 FROM social_post_likes l WHERE l.post_id = p.id AND l.membership_id = ?) AS liked_by_me,
      (SELECT COUNT(*) FROM social_comments c WHERE c.post_id = p.id) AS comments_count
    FROM social_posts p JOIN users u ON u.id = p.user_id
    JOIN memberships pm ON pm.id = p.membership_id
    WHERE pm.dojotai_id = ? AND pm.status = 'active' ORDER BY p.created_at DESC`,
      )
      .all(user.membership_id, user.dojotai_id) as {
      id: string;
      body: string;
      media_json: string;
      created_at: string;
      author_id: string;
      full_name: string;
      username: string;
      avatar_url: string | null;
      likes_count: number;
      liked_by_me: number;
      comments_count: number;
    }[];
    return {
      posts: rows.map((row) => ({
        id: row.id,
        body: row.body,
        media: JSON.parse(row.media_json),
        createdAt: row.created_at,
        likesCount: row.likes_count,
        likedByMe: Boolean(row.liked_by_me),
        commentsCount: row.comments_count,
        author: {
          userId: row.author_id,
          fullName: row.full_name,
          username: row.username,
          avatarUrl: row.avatar_url,
        },
      })),
    };
  });

  app.post<{ Params: { postId: string } }>(
    "/api/social/posts/:postId/likes",
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id || !user.dojotai_id) return;
      const post = db
        .prepare(
          `SELECT p.id FROM social_posts p JOIN memberships m ON m.id = p.membership_id WHERE p.id = ? AND m.dojotai_id = ? AND m.status = 'active'`,
        )
        .get(request.params.postId, user.dojotai_id);
      if (!post)
        return reply.code(404).send({ error: "Publicação não encontrada." });
      db.prepare(
        "INSERT OR IGNORE INTO social_post_likes (post_id, user_id, membership_id, created_at) VALUES (?, ?, ?, ?)",
      ).run(request.params.postId, user.id, user.membership_id, nowIso());
      return { ok: true };
    },
  );

  app.delete<{ Params: { postId: string } }>(
    "/api/social/posts/:postId/likes",
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id) return;
      db.prepare(
        "DELETE FROM social_post_likes WHERE post_id = ? AND membership_id = ?",
      ).run(request.params.postId, user.membership_id);
      return { ok: true };
    },
  );

  app.get<{ Params: { postId: string } }>(
    "/api/social/posts/:postId/comments",
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id || !user.dojotai_id) return;
      const post = db
        .prepare(
          `SELECT p.id FROM social_posts p JOIN memberships m ON m.id = p.membership_id WHERE p.id = ? AND m.dojotai_id = ? AND m.status = 'active'`,
        )
        .get(request.params.postId, user.dojotai_id);
      if (!post)
        return reply.code(404).send({ error: "Publicação não encontrada." });
      const rows = db
        .prepare(
          `SELECT c.id, c.body, c.created_at, c.updated_at, u.id AS user_id, u.full_name, u.username, u.avatar_url
    FROM social_comments c JOIN users u ON u.id = c.user_id JOIN memberships m ON m.id = c.membership_id
    WHERE c.post_id = ? AND m.dojotai_id = ? AND m.status = 'active' ORDER BY c.created_at`,
        )
        .all(request.params.postId, user.dojotai_id) as {
        id: string;
        body: string;
        created_at: string;
        updated_at: string;
        user_id: string;
        full_name: string;
        username: string;
        avatar_url: string | null;
      }[];
      return {
        comments: rows.map((row) => ({
          id: row.id,
          body: row.body,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          author: {
            userId: row.user_id,
            fullName: row.full_name,
            username: row.username,
            avatarUrl: row.avatar_url,
          },
        })),
      };
    },
  );

  app.post<{ Params: { postId: string }; Body: { body: string } }>(
    "/api/social/posts/:postId/comments",
    {
      schema: {
        body: {
          type: "object",
          required: ["body"],
          additionalProperties: false,
          properties: {
            body: { type: "string", minLength: 1, maxLength: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id || !user.dojotai_id) return;
      const post = db
        .prepare(
          `SELECT p.id FROM social_posts p JOIN memberships m ON m.id = p.membership_id WHERE p.id = ? AND m.dojotai_id = ? AND m.status = 'active'`,
        )
        .get(request.params.postId, user.dojotai_id);
      if (!post)
        return reply.code(404).send({ error: "Publicação não encontrada." });
      const body = request.body.body.trim();
      if (!body)
        return reply
          .code(400)
          .send({ error: "Escreva um comentário antes de publicar." });
      const id = randomUUID();
      const now = nowIso();
      db.prepare(
        "INSERT INTO social_comments (id, post_id, user_id, membership_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        request.params.postId,
        user.id,
        user.membership_id,
        body,
        now,
        now,
      );
      return reply
        .code(201)
        .send({
          id,
          body,
          createdAt: now,
          updatedAt: now,
          author: {
            userId: user.id,
            fullName: user.full_name,
            username: user.username,
            avatarUrl: user.avatar_url,
          },
        });
    },
  );

  app.patch<{
    Params: { postId: string; commentId: string };
    Body: { body: string };
  }>(
    "/api/social/posts/:postId/comments/:commentId",
    {
      schema: {
        body: {
          type: "object",
          required: ["body"],
          additionalProperties: false,
          properties: {
            body: { type: "string", minLength: 1, maxLength: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id) return;
      const body = request.body.body.trim();
      if (!body)
        return reply
          .code(400)
          .send({ error: "Escreva um comentário antes de salvar." });
      const result = db
        .prepare(
          "UPDATE social_comments SET body = ?, updated_at = ? WHERE id = ? AND post_id = ? AND user_id = ? AND membership_id = ?",
        )
        .run(
          body,
          nowIso(),
          request.params.commentId,
          request.params.postId,
          user.id,
          user.membership_id,
        );
      if (!result.changes)
        return reply
          .code(404)
          .send({
            error: "Comentário não encontrado ou sem permissão para editar.",
          });
      return { ok: true };
    },
  );

  app.delete<{ Params: { postId: string; commentId: string } }>(
    "/api/social/posts/:postId/comments/:commentId",
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id) return;
      const result = db
        .prepare(
          "DELETE FROM social_comments WHERE id = ? AND post_id = ? AND user_id = ? AND membership_id = ?",
        )
        .run(
          request.params.commentId,
          request.params.postId,
          user.id,
          user.membership_id,
        );
      if (!result.changes)
        return reply
          .code(404)
          .send({
            error: "Comentário não encontrado ou sem permissão para remover.",
          });
      return { ok: true };
    },
  );

  app.post<{ Body: { body: string; media: MediaItem[] } }>(
    "/api/social/posts",
    {
      schema: {
        body: {
          type: "object",
          required: ["body", "media"],
          additionalProperties: false,
          properties: {
            body: { type: "string", maxLength: 2000 },
            media: mediaSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id) return;
      const body = request.body.body.trim();
      const media = request.body.media;
      if (!body && media.length === 0)
        return reply
          .code(400)
          .send({ error: "Escreva algo ou anexe uma mídia para publicar." });
      const mediaError = validateMedia(media);
      if (mediaError) return reply.code(400).send({ error: mediaError });
      const id = randomUUID();
      db.prepare(
        "INSERT INTO social_posts (id, user_id, membership_id, body, media_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        user.id,
        user.membership_id,
        body,
        JSON.stringify(media),
        nowIso(),
      );
      return reply.code(201).send({ id });
    },
  );
}
