-- Migration 0002: Post-discovery intelligence pass
-- Adds intelligence_status and intelligence_result to projects.

ALTER TABLE projects ADD COLUMN intelligence_status TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN intelligence_result TEXT;
