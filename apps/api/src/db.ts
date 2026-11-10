import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { initializeSchema } from "./database/schema.js";

const configuredPath = process.env.DATABASE_PATH ?? "../../data/gotai.sqlite";
const databasePath = path.resolve(process.cwd(), configuredPath);

mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
initializeSchema(db);
