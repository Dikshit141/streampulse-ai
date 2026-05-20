-- ─────────────────────────────────────────────────────────────
--  StreamPulse AI — Database Schema
--  Auto-runs on first `docker compose up` via postgres entrypoint
-- ─────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Streams ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streams (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'ended', 'paused')),
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Live Analytics Snapshots ──────────────────────────────────
-- One row per aggregation tick (every 5s per stream)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id                  BIGSERIAL PRIMARY KEY,
    stream_id           UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    concurrent_viewers  INT NOT NULL DEFAULT 0,
    buffering_rate      NUMERIC(5,4) NOT NULL DEFAULT 0,   -- 0.0000–1.0000
    avg_bitrate_kbps    NUMERIC(8,2) NOT NULL DEFAULT 0,
    engagement_score    NUMERIC(5,4) NOT NULL DEFAULT 0,   -- 0.0000–1.0000
    drop_probability    NUMERIC(5,4),                       -- from ML service
    captured_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_stream_time
    ON analytics_snapshots(stream_id, captured_at DESC);

-- ── Trending Moments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trending_moments (
    id              BIGSERIAL PRIMARY KEY,
    stream_id       UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    viewer_count    INT NOT NULL,
    spike_pct       NUMERIC(6,2) NOT NULL,     -- e.g. 23.5 means 23.5% spike
    window_seconds  INT NOT NULL DEFAULT 60,
    label           VARCHAR(100),               -- e.g. "Goal Scored", "Break"
    is_replay_worthy BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_moments_stream_time
    ON trending_moments(stream_id, detected_at DESC);

-- ── Alert Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id          BIGSERIAL PRIMARY KEY,
    stream_id   UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    alert_type  VARCHAR(50) NOT NULL,     -- 'high_drop_risk', 'buffer_spike', 'trending'
    severity    VARCHAR(20) NOT NULL      -- 'info', 'warning', 'critical'
                CHECK (severity IN ('info', 'warning', 'critical')),
    message     TEXT NOT NULL,
    payload     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_stream_time
    ON alerts(stream_id, created_at DESC);

-- ── Sentiment Snapshots ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentiment_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    stream_id       UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    positive        NUMERIC(5,4) NOT NULL DEFAULT 0,
    neutral         NUMERIC(5,4) NOT NULL DEFAULT 0,
    negative        NUMERIC(5,4) NOT NULL DEFAULT 0,
    sample_count    INT NOT NULL DEFAULT 0,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_stream_time
    ON sentiment_snapshots(stream_id, captured_at DESC);

-- ── Seed: default demo stream ─────────────────────────────────
INSERT INTO streams (id, title, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'IPL 2025 Final — Mumbai Indians vs Chennai Super Kings',
    'active'
) ON CONFLICT DO NOTHING;

-- ── Helpful views ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_stream_live_stats AS
SELECT
    s.id                AS stream_id,
    s.title,
    s.status,
    a.concurrent_viewers,
    a.buffering_rate,
    a.avg_bitrate_kbps,
    a.engagement_score,
    a.drop_probability,
    a.captured_at       AS last_snapshot_at
FROM streams s
LEFT JOIN LATERAL (
    SELECT * FROM analytics_snapshots
    WHERE stream_id = s.id
    ORDER BY captured_at DESC
    LIMIT 1
) a ON true
WHERE s.status = 'active';
