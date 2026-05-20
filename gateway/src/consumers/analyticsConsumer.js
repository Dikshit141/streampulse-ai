const { getConsumer, getProducer, STREAM_KEY, GROUP_NAME } = require("../config/redis");
const { query } = require("../config/postgres");
const { emitStats, emitMoment, emitAlert } = require("../socket");
const { metrics } = require("../utils/metrics");
const logger = require("../utils/logger");

const CONSUMER_NAME = "analytics-worker-1";
const BLOCK_MS      = 1000;   // block for 1s waiting for new messages
const BATCH_SIZE    = 50;     // read up to 50 messages per poll
const TICK_INTERVAL = 5000;   // push aggregated stats every 5 seconds

// Rolling window for trending moment detection
const viewerHistory = [];     // { ts, count }
const WINDOW_MS     = 60000;  // 60-second sliding window
const SPIKE_THRESHOLD = 0.20; // 20% increase = trending

// In-memory accumulator (reset every TICK_INTERVAL)
let accumulator = {
  eventCount:     0,
  bufferingSum:   0,
  bitrateSum:     0,
  watchPctSum:    0,
  engagementSum:  0,
  latestViewer:   0,
  latestHour:     new Date().getHours(),
};

// ── Parse a flat Redis Stream message into an object ──────────
function parseMessage(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return obj;
}

// ── Trending moment detection ─────────────────────────────────
async function checkTrendingMoment(streamId, currentCount) {
  const now = Date.now();

  // Evict old entries outside the window
  while (viewerHistory.length && viewerHistory[0].ts < now - WINDOW_MS) {
    viewerHistory.shift();
  }

  if (viewerHistory.length > 0) {
    const oldest = viewerHistory[0].count;
    const spikePct = (currentCount - oldest) / oldest;

    if (spikePct >= SPIKE_THRESHOLD) {
      logger.info(`🔥 Trending moment! ${(spikePct * 100).toFixed(1)}% spike → ${currentCount} viewers`);

      // Persist to PostgreSQL
      const { rows } = await query(
        `INSERT INTO trending_moments (stream_id, viewer_count, spike_pct, label)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [streamId, currentCount, (spikePct * 100).toFixed(2), "Viewer Spike"]
      );

      const moment = rows[0];
      emitMoment(streamId, moment);
      metrics.trendingMomentsTotal.inc({ stream_id: streamId });

      // Clear history to avoid re-triggering immediately
      viewerHistory.length = 0;
    }
  }

  viewerHistory.push({ ts: now, count: currentCount });
}

// ── Alert thresholds ──────────────────────────────────────────
async function checkAlerts(streamId, stats) {
  const alerts = [];

  if (stats.buffering_rate > 0.25) {
    alerts.push({
      alert_type: "buffer_spike",
      severity:   stats.buffering_rate > 0.5 ? "critical" : "warning",
      message:    `Buffering rate at ${(stats.buffering_rate * 100).toFixed(1)}% — viewers experiencing degraded quality`,
      payload:    stats,
    });
  }

  if (stats.drop_probability !== null && stats.drop_probability > 0.65) {
    alerts.push({
      alert_type: "high_drop_risk",
      severity:   stats.drop_probability > 0.8 ? "critical" : "warning",
      message:    `Drop risk at ${(stats.drop_probability * 100).toFixed(0)}% — recommend CDN scale-out`,
      payload:    stats,
    });
  }

  for (const alert of alerts) {
    await query(
      `INSERT INTO alerts (stream_id, alert_type, severity, message, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [streamId, alert.alert_type, alert.severity, alert.message, JSON.stringify(alert.payload)]
    );
    emitAlert(streamId, { ...alert, stream_id: streamId, created_at: new Date().toISOString() });
  }
}

// ── Persist snapshot + push to dashboard ─────────────────────
async function flushStats(streamId) {
  if (accumulator.eventCount === 0) return;

  const n = accumulator.eventCount;
  const stats = {
    stream_id:          streamId,
    concurrent_viewers: accumulator.latestViewer,
    buffering_rate:     parseFloat((accumulator.bufferingSum / n).toFixed(4)),
    avg_bitrate_kbps:   parseFloat((accumulator.bitrateSum  / n).toFixed(2)),
    watch_percentage:   parseFloat((accumulator.watchPctSum / n).toFixed(4)),
    engagement_score:   parseFloat((accumulator.engagementSum / n).toFixed(4)),
    time_of_day_hour:   accumulator.latestHour,
    drop_probability:   null,  // filled by ML service on frontend
    captured_at:        new Date().toISOString(),
  };

  // ── Save snapshot to PostgreSQL ───────────────────────────
  await query(
    `INSERT INTO analytics_snapshots
       (stream_id, concurrent_viewers, buffering_rate, avg_bitrate_kbps, engagement_score)
     VALUES ($1, $2, $3, $4, $5)`,
    [stats.stream_id, stats.concurrent_viewers, stats.buffering_rate, stats.avg_bitrate_kbps, stats.engagement_score]
  );

  // ── Update Prometheus gauges ──────────────────────────────
  metrics.concurrentViewers.set({ stream_id: streamId }, stats.concurrent_viewers);
  metrics.bufferingRate.set(    { stream_id: streamId }, stats.buffering_rate);
  metrics.engagementScore.set(  { stream_id: streamId }, stats.engagement_score);

  // ── Push to Socket.IO ─────────────────────────────────────
  emitStats(streamId, stats);

  // ── Trending moment check ─────────────────────────────────
  await checkTrendingMoment(streamId, stats.concurrent_viewers);

  // ── Alert checks ─────────────────────────────────────────
  await checkAlerts(streamId, stats);

  // Reset accumulator
  accumulator = {
    eventCount:    0,
    bufferingSum:  0,
    bitrateSum:    0,
    watchPctSum:   0,
    engagementSum: 0,
    latestViewer:  stats.concurrent_viewers,
    latestHour:    new Date().getHours(),
  };
}

// ── Main consumer loop ────────────────────────────────────────
async function startConsumer() {
  const redis    = getConsumer();
  const streamId = "00000000-0000-0000-0000-000000000001"; // demo stream

  logger.info("📡 Analytics consumer starting...");

  // Flush aggregated stats on a timer
  setInterval(() => flushStats(streamId).catch(err =>
    logger.error("Flush error:", err.message)
  ), TICK_INTERVAL);

  // Blocking read loop
  (async function readLoop() {
    while (true) {
      try {
        const end = metrics.metrics?.eventProcessingDuration?.startTimer?.() || (() => {});

        // XREADGROUP — blocking read from the consumer group
        const results = await redis.xreadgroup(
          "GROUP", GROUP_NAME, CONSUMER_NAME,
          "COUNT", BATCH_SIZE,
          "BLOCK", BLOCK_MS,
          "STREAMS", STREAM_KEY, ">"
        );

        if (results) {
          for (const [, messages] of results) {
            const ids = [];
            for (const [id, fields] of messages) {
              const event = parseMessage(fields);

              // Accumulate
              accumulator.eventCount++;
              accumulator.bufferingSum  += parseFloat(event.buffering_rate  || 0);
              accumulator.bitrateSum    += parseFloat(event.avg_bitrate_kbps || 0);
              accumulator.watchPctSum   += parseFloat(event.watch_percentage || 0);
              accumulator.engagementSum += parseFloat(event.engagement_score || 0);
              accumulator.latestViewer   = parseInt(event.viewer_count || 0);
              accumulator.latestHour     = parseInt(event.time_of_day_hour || 0);

              ids.push(id);
            }

            // ACK processed messages
            if (ids.length) {
              await getProducer().xack(STREAM_KEY, GROUP_NAME, ...ids);
            }
          }
        }

        end();
      } catch (err) {
        if (!err.message?.includes("Connection is closed")) {
          logger.error("Consumer loop error:", err.message);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  })();

  logger.info("✅ Analytics consumer running");
}

module.exports = { startConsumer };
