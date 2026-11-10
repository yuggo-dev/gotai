import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import {
  nowIso,
  requireTaityo,
  requireUser,
  roles,
  type SessionUser,
} from "../lib/request-context.js";

export function registerOrganogramRoutes(app: FastifyInstance): void {
  type OrgRole = (typeof roles)[number];
  type OrgPositionBody = {
    role: OrgRole;
    membershipId: string;
    buntaiId: string | null;
    reportsToPositionId: string | null;
  };

  function canManageOrgChart(user: SessionUser): boolean {
    if (!user.membership_id || !user.dojotai_id) return false;
    if (user.roles.includes("Taityo")) return true;
    return Boolean(
      db
        .prepare(
          "SELECT 1 FROM org_chart_admins WHERE dojotai_id = ? AND membership_id = ?",
        )
        .get(user.dojotai_id, user.membership_id),
    );
  }

  function requireOrgChartManager(
    request: FastifyRequest,
    reply: FastifyReply,
  ): SessionUser | null {
    const user = requireUser(request, reply);
    if (!user) return null;
    if (!user.membership_id || !user.dojotai_id) {
      void reply
        .code(403)
        .send({ error: "É necessário ter vínculo ativo com um Dojotai." });
      return null;
    }
    if (!canManageOrgChart(user)) {
      void reply
        .code(403)
        .send({ error: "Você não tem permissão para editar o organograma." });
      return null;
    }
    return user;
  }

  function validateOrgPosition(
    dojotaiId: string,
    body: OrgPositionBody,
    positionId?: string,
  ): string | null {
    const member = db
      .prepare(
        "SELECT id, buntai_id FROM memberships WHERE id = ? AND dojotai_id = ? AND status = 'active'",
      )
      .get(body.membershipId, dojotaiId) as
      { id: string; buntai_id: string | null } | undefined;
    if (!member) return "Selecione uma pessoa ativa deste Dojotai.";
    if (
      !db
        .prepare(
          "SELECT 1 FROM membership_roles WHERE membership_id = ? AND role = ?",
        )
        .get(member.id, body.role)
    ) {
      return "A pessoa precisa ter esse cargo atribuído antes de ocupar a posição.";
    }

    const buntaiRequired = ["Buntaityo", "Fukubuntaityo", "Shomu"].includes(
      body.role,
    );
    if (buntaiRequired && !body.buntaiId)
      return `${body.role} precisa estar associado a um Buntai.`;
    if (body.buntaiId) {
      const buntai = db
        .prepare("SELECT 1 FROM buntais WHERE id = ? AND dojotai_id = ?")
        .get(body.buntaiId, dojotaiId);
      if (!buntai) return "O Buntai selecionado não pertence a este Dojotai.";
      if (buntaiRequired && member.buntai_id !== body.buntaiId)
        return "O Buntai da posição deve corresponder ao Buntai atribuído à pessoa.";
    }

    let parent:
      | {
          id: string;
          role: string;
          buntai_id: string | null;
          reports_to_position_id: string | null;
        }
      | undefined;
    if (body.reportsToPositionId) {
      parent = db
        .prepare(
          "SELECT id, role, buntai_id, reports_to_position_id FROM org_positions WHERE id = ? AND dojotai_id = ?",
        )
        .get(body.reportsToPositionId, dojotaiId) as typeof parent;
      if (!parent || parent.id === positionId)
        return "A posição superior selecionada é inválida.";
      const allowedParents: Record<OrgRole, string[]> = {
        Taityo: [],
        Buntaityo: ["Shotaityo", "Fukutaityo", "Taityo"],
        Fukubuntaityo: ["Buntaityo"],
        Shotaityo: ["Fukutaityo", "Taityo"],
        Fukutaityo: ["Taityo"],
        Shomu: [],
      };
      if (!allowedParents[body.role].includes(parent.role))
        return "Esse cargo não pode se vincular à posição superior escolhida.";
      if (body.role === "Fukubuntaityo" && parent.buntai_id !== body.buntaiId)
        return "O Fukubuntaityo deve se vincular ao Buntaityo do mesmo Buntai.";

      let ancestorId: string | null = parent.id;
      const seen = new Set<string>();
      while (ancestorId) {
        if (ancestorId === positionId)
          return "Esse vínculo criaria um ciclo no organograma.";
        if (seen.has(ancestorId))
          return "A estrutura atual contém um ciclo e não pode receber essa alteração.";
        seen.add(ancestorId);
        const ancestor = db
          .prepare(
            "SELECT reports_to_position_id FROM org_positions WHERE id = ? AND dojotai_id = ?",
          )
          .get(ancestorId, dojotaiId) as
          { reports_to_position_id: string | null } | undefined;
        ancestorId = ancestor?.reports_to_position_id ?? null;
      }
    }
    if (body.role === "Taityo" && body.reportsToPositionId)
      return "A posição de Taityo é a raiz da sede e não possui superior.";
    if (
      body.role === "Taityo" &&
      db
        .prepare(
          "SELECT 1 FROM org_positions WHERE dojotai_id = ? AND role = 'Taityo' AND id != ?",
        )
        .get(dojotaiId, positionId ?? "")
    )
      return "Este Dojotai já tem uma posição de Taityo.";
    return null;
  }

  app.get("/api/organograma", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!user.membership_id || !user.dojotai_id)
      return reply
        .code(403)
        .send({ error: "É necessário ter vínculo ativo com um Dojotai." });
    const canManage = canManageOrgChart(user);
    const positionRows = db
      .prepare(
        `SELECT p.id, p.role, p.membership_id, p.buntai_id, p.reports_to_position_id,
      u.full_name, u.username, u.avatar_url, b.name AS buntai_name
    FROM org_positions p JOIN memberships m ON m.id = p.membership_id
      JOIN users u ON u.id = m.user_id LEFT JOIN buntais b ON b.id = p.buntai_id
    WHERE p.dojotai_id = ? AND m.status = 'active' ORDER BY p.role, u.full_name`,
      )
      .all(user.dojotai_id) as {
      id: string;
      role: string;
      membership_id: string;
      buntai_id: string | null;
      reports_to_position_id: string | null;
      full_name: string;
      username: string;
      avatar_url: string | null;
      buntai_name: string | null;
    }[];
    const positions = positionRows.map((position) => ({
      id: position.id,
      role: position.role,
      membershipId: position.membership_id,
      buntaiId: position.buntai_id,
      reportsToPositionId: position.reports_to_position_id,
      fullName: position.full_name,
      username: position.username,
      avatarUrl: position.avatar_url,
      buntaiName: position.buntai_name,
    }));
    const buntais = db
      .prepare(
        "SELECT id, name FROM buntais WHERE dojotai_id = ? ORDER BY name",
      )
      .all(user.dojotai_id);
    const members = canManage
      ? (
          db
            .prepare(
              `SELECT m.id AS membership_id, u.full_name, u.username, m.buntai_id, b.name AS buntai_name,
      group_concat(mr.role, '|') AS roles
    FROM memberships m JOIN users u ON u.id = m.user_id
      LEFT JOIN buntais b ON b.id = m.buntai_id LEFT JOIN membership_roles mr ON mr.membership_id = m.id
    WHERE m.dojotai_id = ? AND m.status = 'active' GROUP BY m.id ORDER BY u.full_name`,
            )
            .all(user.dojotai_id) as {
            membership_id: string;
            full_name: string;
            username: string;
            buntai_id: string | null;
            buntai_name: string | null;
            roles: string | null;
          }[]
        ).map((member) => ({
          membershipId: member.membership_id,
          fullName: member.full_name,
          username: member.username,
          buntaiId: member.buntai_id,
          buntaiName: member.buntai_name,
          roles: member.roles?.split("|") ?? [],
        }))
      : [];
    const delegates = user.roles.includes("Taityo")
      ? db
          .prepare(
            `SELECT a.membership_id, u.full_name, u.username
    FROM org_chart_admins a JOIN memberships m ON m.id = a.membership_id JOIN users u ON u.id = m.user_id
    WHERE a.dojotai_id = ? AND m.status = 'active' ORDER BY u.full_name`,
          )
          .all(user.dojotai_id)
      : [];
    return {
      canManage,
      canDelegate: user.roles.includes("Taityo"),
      currentMembershipId: user.membership_id,
      positions,
      buntais,
      members,
      delegates,
    };
  });

  app.post<{ Body: OrgPositionBody }>(
    "/api/organograma/positions",
    {
      schema: {
        body: {
          type: "object",
          required: ["role", "membershipId", "buntaiId", "reportsToPositionId"],
          additionalProperties: false,
          properties: {
            role: { type: "string", enum: [...roles] },
            membershipId: { type: "string", format: "uuid" },
            buntaiId: {
              anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
            },
            reportsToPositionId: {
              anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const manager = requireOrgChartManager(request, reply);
      if (!manager?.dojotai_id) return;
      const error = validateOrgPosition(manager.dojotai_id, request.body);
      if (error) return reply.code(400).send({ error });
      const timestamp = nowIso();
      const id = randomUUID();
      db.prepare(
        `INSERT INTO org_positions (id, dojotai_id, role, membership_id, buntai_id, reports_to_position_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        manager.dojotai_id,
        request.body.role,
        request.body.membershipId,
        request.body.buntaiId,
        request.body.reportsToPositionId,
        timestamp,
        timestamp,
      );
      return reply.code(201).send({ id });
    },
  );

  app.put<{ Params: { positionId: string }; Body: OrgPositionBody }>(
    "/api/organograma/positions/:positionId",
    {
      schema: {
        body: {
          type: "object",
          required: ["role", "membershipId", "buntaiId", "reportsToPositionId"],
          additionalProperties: false,
          properties: {
            role: { type: "string", enum: [...roles] },
            membershipId: { type: "string", format: "uuid" },
            buntaiId: {
              anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
            },
            reportsToPositionId: {
              anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const manager = requireOrgChartManager(request, reply);
      if (!manager?.dojotai_id) return;
      const exists = db
        .prepare("SELECT 1 FROM org_positions WHERE id = ? AND dojotai_id = ?")
        .get(request.params.positionId, manager.dojotai_id);
      if (!exists)
        return reply.code(404).send({ error: "Posição não encontrada." });
      const error = validateOrgPosition(
        manager.dojotai_id,
        request.body,
        request.params.positionId,
      );
      if (error) return reply.code(400).send({ error });
      db.prepare(
        `UPDATE org_positions SET role = ?, membership_id = ?, buntai_id = ?, reports_to_position_id = ?, updated_at = ?
    WHERE id = ? AND dojotai_id = ?`,
      ).run(
        request.body.role,
        request.body.membershipId,
        request.body.buntaiId,
        request.body.reportsToPositionId,
        nowIso(),
        request.params.positionId,
        manager.dojotai_id,
      );
      return { ok: true };
    },
  );

  app.delete<{ Params: { positionId: string } }>(
    "/api/organograma/positions/:positionId",
    async (request, reply) => {
      const manager = requireOrgChartManager(request, reply);
      if (!manager?.dojotai_id) return;
      const children = db
        .prepare(
          "SELECT 1 FROM org_positions WHERE reports_to_position_id = ? AND dojotai_id = ? LIMIT 1",
        )
        .get(request.params.positionId, manager.dojotai_id);
      if (children)
        return reply
          .code(409)
          .send({
            error:
              "Realinhe as posições subordinadas antes de remover esta posição.",
          });
      const result = db
        .prepare("DELETE FROM org_positions WHERE id = ? AND dojotai_id = ?")
        .run(request.params.positionId, manager.dojotai_id);
      if (!result.changes)
        return reply.code(404).send({ error: "Posição não encontrada." });
      return { ok: true };
    },
  );

  app.post<{ Body: { membershipId: string } }>(
    "/api/organograma/delegates",
    {
      schema: {
        body: {
          type: "object",
          required: ["membershipId"],
          additionalProperties: false,
          properties: { membershipId: { type: "string", format: "uuid" } },
        },
      },
    },
    async (request, reply) => {
      const taityo = requireTaityo(request, reply);
      if (!taityo?.membership_id || !taityo.dojotai_id) return;
      const target = db
        .prepare(
          "SELECT id FROM memberships WHERE id = ? AND dojotai_id = ? AND status = 'active'",
        )
        .get(request.body.membershipId, taityo.dojotai_id) as
        { id: string } | undefined;
      if (!target)
        return reply
          .code(404)
          .send({ error: "Integrante ativo não encontrado neste Dojotai." });
      if (target.id === taityo.membership_id)
        return reply
          .code(400)
          .send({
            error: "O Taityo já administra o organograma automaticamente.",
          });
      db.prepare(
        "INSERT OR IGNORE INTO org_chart_admins (id, dojotai_id, membership_id, granted_by, granted_at) VALUES (?, ?, ?, ?, ?)",
      ).run(randomUUID(), taityo.dojotai_id, target.id, taityo.id, nowIso());
      return reply.code(201).send({ ok: true });
    },
  );

  app.delete<{ Params: { membershipId: string } }>(
    "/api/organograma/delegates/:membershipId",
    async (request, reply) => {
      const taityo = requireTaityo(request, reply);
      if (!taityo?.dojotai_id) return;
      const result = db
        .prepare(
          "DELETE FROM org_chart_admins WHERE dojotai_id = ? AND membership_id = ?",
        )
        .run(taityo.dojotai_id, request.params.membershipId);
      if (!result.changes)
        return reply.code(404).send({ error: "Delegação não encontrada." });
      return { ok: true };
    },
  );
}
