import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db.js";

export const categories = ["Shonenbu", "Pré-Mahikaritai", "Oficial"] as const;
export const roles = [
  "Fukubuntaityo",
  "Buntaityo",
  "Shotaityo",
  "Fukutaityo",
  "Taityo",
  "Shomu",
] as const;

export type UserRow = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  description: string | null;
  avatar_url: string | null;
};
export type SessionUser = UserRow & {
  membership_id: string | null;
  dojotai_id: string | null;
  dojotai_name: string | null;
  category: string | null;
  buntai_name: string | null;
  roles: string[];
  latest_request_status: string | null;
};

declare module "fastify" {
  interface FastifyRequest {
    sessionUser: SessionUser | null;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
): SessionUser | null {
  if (!request.sessionUser) {
    void reply.code(401).send({ error: "Faça login para continuar." });
    return null;
  }
  return request.sessionUser;
}

export function requireTaityo(
  request: FastifyRequest,
  reply: FastifyReply,
): SessionUser | null {
  const user = requireUser(request, reply);
  if (!user) return null;
  if (!user.roles.includes("Taityo")) {
    void reply
      .code(403)
      .send({ error: "Esta ação exige permissão de Taityo." });
    return null;
  }
  return user;
}
