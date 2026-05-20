const client = require("prom-client");

const register = new client.Registry();

// Default Node.js metrics (memory, CPU, event loop lag)
client.collectDefaultMetrics({ register, prefix: "streampulse_node_" });

// ── Custom business metrics ───────────────────────────────────

const concurrentViewers = new client.Gauge({
  name: "streampulse_concurrent_viewers",
  help: "Current number of concurrent viewers across all active streams",
  labelNames: ["stream_id"],
  registers: [register],
});

const bufferingRate = new client.Gauge({
  name: "streampulse_buffering_rate",
  help: "Current buffering rate (0-1) per stream",
  labelNames: ["stream_id"],
  registers: [register],
});

const engagementScore = new client.Gauge({
  name: "streampulse_engagement_score",
  help: "Current engagement score (0-1) per stream",
  labelNames: ["stream_id"],
  registers: [register],
});

const dropProbability = new client.Gauge({
  name: "streampulse_drop_probability",
  help: "ML-predicted drop probability (0-1) per stream",
  labelNames: ["stream_id"],
  registers: [register],
});

const eventsTotal = new client.Counter({
  name: "streampulse_events_total",
  help: "Total viewer events processed",
  labelNames: ["event_type", "stream_id"],
  registers: [register],
});

const eventProcessingDuration = new client.Histogram({
  name: "streampulse_event_processing_duration_seconds",
  help: "Time to process a batch of stream events",
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

const trendingMomentsTotal = new client.Counter({
  name: "streampulse_trending_moments_total",
  help: "Total trending moments detected",
  labelNames: ["stream_id"],
  registers: [register],
});

module.exports = {
  register,
  metrics: {
    concurrentViewers,
    bufferingRate,
    engagementScore,
    dropProbability,
    eventsTotal,
    eventProcessingDuration,
    trendingMomentsTotal,
  },
};
