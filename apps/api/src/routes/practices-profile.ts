import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { nowIso, requireUser } from "../lib/request-context.js";

const practiceKeys = [
  "okiyome",
  "omairi",
  "leitura",
  "frequencia_sede",
] as const;
type PracticeKey = (typeof practiceKeys)[number];

export function registerPracticesProfileRoutes(app: FastifyInstance): void {
  function localDateString(date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Campo_Grande",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function validPracticeDate(value: string, today: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    )
      return false;
    const daysAgo =
      (Date.parse(`${today}T12:00:00Z`) - parsed.getTime()) / 86400000;
    return Number.isInteger(daysAgo) && daysAgo >= 0 && daysAgo <= 2;
  }

  app.get("/api/me/practices", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user?.membership_id) return;
    const rows = db
      .prepare(
        "SELECT practice_key, practice_date FROM practice_logs WHERE membership_id = ? ORDER BY practice_date DESC",
      )
      .all(user.membership_id) as {
      practice_key: PracticeKey;
      practice_date: string;
    }[];
    return {
      today: localDateString(),
      logs: rows.map((row) => ({
        practiceKey: row.practice_key,
        date: row.practice_date,
      })),
    };
  });

  app.post<{
    Body: { practiceKey: PracticeKey; date: string; performed: boolean };
  }>(
    "/api/me/practices",
    {
      schema: {
        body: {
          type: "object",
          required: ["practiceKey", "date", "performed"],
          additionalProperties: false,
          properties: {
            practiceKey: { type: "string", enum: [...practiceKeys] },
            date: { type: "string", format: "date" },
            performed: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id) return;
      const today = localDateString();
      if (!validPracticeDate(request.body.date, today))
        return reply
          .code(400)
          .send({
            error:
              "Você pode registrar ou corrigir práticas de hoje e dos dois dias anteriores.",
          });
      if (request.body.performed) {
        const timestamp = nowIso();
        db.prepare(
          `INSERT INTO practice_logs (id, user_id, membership_id, practice_key, practice_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(membership_id, practice_key, practice_date) DO UPDATE SET updated_at = excluded.updated_at`,
        ).run(
          randomUUID(),
          user.id,
          user.membership_id,
          request.body.practiceKey,
          request.body.date,
          timestamp,
          timestamp,
        );
      } else {
        db.prepare(
          "DELETE FROM practice_logs WHERE membership_id = ? AND practice_key = ? AND practice_date = ?",
        ).run(user.membership_id, request.body.practiceKey, request.body.date);
      }
      return { ok: true };
    },
  );

  app.put<{
    Body: {
      fullName: string;
      username: string;
      description: string;
      avatarDataUrl: string | null;
    };
  }>(
    "/api/me/profile",
    {
      schema: {
        body: {
          type: "object",
          required: ["fullName", "username", "description", "avatarDataUrl"],
          additionalProperties: false,
          properties: {
            fullName: { type: "string", minLength: 2, maxLength: 120 },
            username: {
              type: "string",
              minLength: 3,
              maxLength: 24,
              pattern: "^[a-zA-Z0-9_.]+$",
            },
            description: { type: "string", maxLength: 280 },
            avatarDataUrl: {
              anyOf: [{ type: "string", maxLength: 1500000 }, { type: "null" }],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = requireUser(request, reply);
      if (!user?.membership_id) return;
      const username = request.body.username.trim().toLowerCase();
      if (
        db
          .prepare("SELECT 1 FROM users WHERE username = ? AND id != ?")
          .get(username, user.id)
      ) {
        return reply.code(409).send({ error: "Esse username já está em uso." });
      }
      if (
        request.body.avatarDataUrl &&
        !/^data:image\/(png|jpeg|webp);base64,/.test(request.body.avatarDataUrl)
      ) {
        return reply
          .code(400)
          .send({ error: "Escolha uma imagem PNG, JPEG ou WebP para a foto." });
      }
      db.prepare(
        "UPDATE users SET full_name = ?, username = ?, description = ?, avatar_url = ? WHERE id = ?",
      ).run(
        request.body.fullName.trim(),
        username,
        request.body.description.trim() || null,
        request.body.avatarDataUrl,
        user.id,
      );
      return { ok: true };
    },
  );
}
