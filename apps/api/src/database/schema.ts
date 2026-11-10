import type Database from "better-sqlite3";

export function initializeSchema(db: Database.Database): void {
  db.exec(`
  CREATE TABLE IF NOT EXISTS dojotais (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    birth_date TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS buntais (
    id TEXT PRIMARY KEY,
    dojotai_id TEXT NOT NULL REFERENCES dojotais(id),
    name TEXT NOT NULL,
    UNIQUE (dojotai_id, name)
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    dojotai_id TEXT NOT NULL REFERENCES dojotais(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS join_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    dojotai_id TEXT NOT NULL REFERENCES dojotais(id),
    invitation_id TEXT NOT NULL REFERENCES invitations(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TEXT NOT NULL,
    decided_at TEXT,
    decided_by TEXT REFERENCES users(id),
    category TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    dojotai_id TEXT NOT NULL REFERENCES dojotais(id),
    category TEXT NOT NULL,
    buntai_id TEXT REFERENCES buntais(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'transferred')),
    joined_at TEXT NOT NULL,
    ended_at TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS one_active_membership_per_user
    ON memberships(user_id) WHERE status = 'active';

  CREATE TABLE IF NOT EXISTS membership_roles (
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (membership_id, role)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS practice_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    practice_key TEXT NOT NULL CHECK (practice_key IN ('okiyome', 'omairi', 'leitura', 'frequencia_sede')),
    practice_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (membership_id, practice_key, practice_date)
  );

  CREATE INDEX IF NOT EXISTS practice_logs_by_member_date
    ON practice_logs(membership_id, practice_date);

  CREATE TABLE IF NOT EXISTS social_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    body TEXT NOT NULL DEFAULT '',
    media_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS social_posts_by_membership_date
    ON social_posts(membership_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS social_post_likes (
    post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (post_id, membership_id)
  );

  CREATE TABLE IF NOT EXISTS social_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS social_comments_by_post_date
    ON social_comments(post_id, created_at);

  CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    media_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    starts_at TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    media_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS events_by_membership_date
    ON events(membership_id, starts_at);

  CREATE TABLE IF NOT EXISTS org_chart_admins (
    id TEXT PRIMARY KEY,
    dojotai_id TEXT NOT NULL REFERENCES dojotais(id) ON DELETE CASCADE,
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    granted_by TEXT NOT NULL REFERENCES users(id),
    granted_at TEXT NOT NULL,
    UNIQUE (dojotai_id, membership_id)
  );

  CREATE TABLE IF NOT EXISTS org_positions (
    id TEXT PRIMARY KEY,
    dojotai_id TEXT NOT NULL REFERENCES dojotais(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Fukubuntaityo', 'Buntaityo', 'Shotaityo', 'Fukutaityo', 'Taityo', 'Shomu')),
    membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    buntai_id TEXT REFERENCES buntais(id) ON DELETE SET NULL,
    reports_to_position_id TEXT REFERENCES org_positions(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS org_positions_by_dojo_parent
    ON org_positions(dojotai_id, reports_to_position_id);

  CREATE UNIQUE INDEX IF NOT EXISTS one_taityo_position_per_dojo
    ON org_positions(dojotai_id) WHERE role = 'Taityo';
`);

  for (const table of ["notices", "events"] as const) {
    const columns = db.pragma(`table_info(${table})`) as { name: string }[];
    if (!columns.some((column) => column.name === "media_json")) {
      db.exec(
        `ALTER TABLE ${table} ADD COLUMN media_json TEXT NOT NULL DEFAULT '[]'`,
      );
    }
  }
}
