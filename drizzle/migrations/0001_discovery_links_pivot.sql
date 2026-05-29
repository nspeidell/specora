-- Migration 0001: CTO-as-a-Service pivot
-- Adds discovery_links table for token-based client sessions.
-- Adds columns to projects and discovery_sessions.
-- Drops cap_tables and cap_table_snapshots (launchpad removed).

-- ── New columns on projects ───────────────────────────────────
ALTER TABLE projects ADD COLUMN discovery_link_id TEXT;
ALTER TABLE projects ADD COLUMN client_name TEXT;
ALTER TABLE projects ADD COLUMN client_email TEXT;

-- ── New column on discovery_sessions ─────────────────────────
ALTER TABLE discovery_sessions ADD COLUMN discovery_link_id TEXT;

-- ── Discovery links ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `discovery_links` (
  `id`                  TEXT PRIMARY KEY NOT NULL,
  `token`               TEXT NOT NULL,
  `created_by_user_id`  TEXT NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `organization_id`     TEXT REFERENCES `organizations`(`id`) ON DELETE SET NULL,
  `project_id`          TEXT REFERENCES `projects`(`id`) ON DELETE SET NULL,
  `session_id`          TEXT,
  `project_name`        TEXT NOT NULL,
  `client_name`         TEXT,
  `client_email`        TEXT,
  `status`              TEXT DEFAULT 'pending',
  `expires_at`          INTEGER,
  `created_at`          INTEGER,
  `updated_at`          INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS `discovery_links_token_idx` ON `discovery_links` (`token`);
CREATE INDEX IF NOT EXISTS `discovery_links_user_idx` ON `discovery_links` (`created_by_user_id`);

-- ── Drop launchpad tables ─────────────────────────────────────
DROP TABLE IF EXISTS `cap_table_snapshots`;
DROP TABLE IF EXISTS `cap_tables`;
