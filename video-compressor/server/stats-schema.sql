-- Run once using the same database role as LIGHTVID_STATS_DATABASE_URL.
-- This private schema does not touch existing application tables.
BEGIN;
CREATE SCHEMA IF NOT EXISTS lightvid_stats;
REVOKE ALL ON SCHEMA lightvid_stats FROM PUBLIC;

CREATE TABLE IF NOT EXISTS lightvid_stats.totals (
  id smallint PRIMARY KEY CHECK (id = 1),
  downloads bigint NOT NULL DEFAULT 0 CHECK (downloads >= 0),
  devices bigint NOT NULL DEFAULT 0 CHECK (devices >= 0 AND devices <= downloads),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO lightvid_stats.totals (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS lightvid_stats.devices (
  device_hash char(64) PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS lightvid_stats.downloads (
  event_id uuid PRIMARY KEY,
  device_hash char(64) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS lightvid_stats_device_time
  ON lightvid_stats.downloads (device_hash, received_at);
COMMIT;
