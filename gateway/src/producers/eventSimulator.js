const { v4: uuidv4 } = require("uuid");
const { getProducer, STREAM_KEY } = require("../config/redis");
const { metrics } = require("../utils/metrics");
const logger = require("../utils/logger");

// Demo stream ID (matches the seeded row in PostgreSQL)
const DEMO_STREAM_ID = "00000000-0000-0000-0000-000000000001";

// Event types with realistic probability weights
const EVENT_TYPES = [
  { type: "play",    weight: 30 },
  { type: "pause",   weight: 10 },
  { type: "buffer",  weight: 15 },
  { type: "seek",    weight: 12 },
  { type: "drop",    weight: 8  },
  { type: "quality", weight: 10 },
  { type: "heartbeat", weight: 15 },
];

const TOTAL_WEIGHT = EVENT_TYPES.reduce((s, e) => s + e.weight, 0);

// Simulated state — evolves over time to create realistic patterns
const state = {
  viewerBase: 8000,
  viewerDelta: 0,
  bufferingPressure: 0,   // 0-1, increases during simulated "load spikes"
  spikeUntil: 0,
};

function weightedRandom() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const e of EVENT_TYPES) {
    r -= e.weight;
    if (r <= 0) return e.type;
  }
  return "heartbeat";
}

function simulateViewerCount() {
  // Random walk with mean reversion
  state.viewerDelta += (Math.random() - 0.5) * 200;
  state.viewerDelta *= 0.95;  // mean reversion

  // Occasional spikes (trending moment simulation)
  if (Math.random() < 0.005) {
    state.viewerDelta += 2000 + Math.random() * 3000;
    state.spikeUntil = Date.now() + 30000;
    logger.info("📈 Simulating viewer spike!");
  }

  const count = Math.max(1000, Math.round(state.viewerBase + state.viewerDelta));
  return count;
}

function simulateBufferingRate() {
  // Random buffering pressure that decays
  if (Math.random() < 0.02) state.bufferingPressure = 0.3 + Math.random() * 0.5;
  state.bufferingPressure *= 0.97;
  return Math.min(0.99, Math.max(0, state.bufferingPressure + Math.random() * 0.05));
}

async function publishEvent(eventType, viewerCount, bufferingRate) {
  const redis = getProducer();
  const now = Date.now();
  const hour = new Date().getHours();

  const watchPct = Math.max(0, Math.min(1, 0.4 + Math.random() * 0.5));
  const avgBitrate = 1500 + Math.random() * 3000;
  const engagement = Math.max(0, Math.min(1,
    (1 - bufferingRate) * 0.4 +
    watchPct * 0.4 +
    (eventType === "play" ? 0.2 : 0)
  ));

  const event = {
    event_id:        uuidv4(),
    stream_id:       DEMO_STREAM_ID,
    event_type:      eventType,
    viewer_count:    String(viewerCount),
    buffering_rate:  String(bufferingRate.toFixed(4)),
    avg_bitrate_kbps: String(Math.round(avgBitrate)),
    watch_percentage: String(watchPct.toFixed(4)),
    engagement_score: String(engagement.toFixed(4)),
    time_of_day_hour: String(hour),
    ts:               String(now),
  };

  // XADD to Redis Stream (auto-generated message ID with *)
  await redis.xadd(STREAM_KEY, "*", ...Object.entries(event).flat());

  // Update Prometheus counters
  metrics.eventsTotal.inc({ event_type: eventType, stream_id: DEMO_STREAM_ID });

  return event;
}

function startSimulator() {
  logger.info("🎬 Event simulator starting...");

  let tick = 0;

  // Publish a burst of events every second
  setInterval(async () => {
    try {
      tick++;
      const viewerCount  = simulateViewerCount();
      const bufferingRate = simulateBufferingRate();

      // Publish 5-15 events per tick (simulating concurrent viewers)
      const burst = 5 + Math.floor(Math.random() * 10);
      for (let i = 0; i < burst; i++) {
        await publishEvent(weightedRandom(), viewerCount, bufferingRate);
      }

      if (tick % 10 === 0) {
        logger.debug(`Simulator tick ${tick}: ${viewerCount} viewers, buffering=${(bufferingRate * 100).toFixed(1)}%`);
      }
    } catch (err) {
      logger.error("Simulator error:", err.message);
    }
  }, 1000);

  logger.info("✅ Event simulator running (1 tick/second)");
}

module.exports = { startSimulator, DEMO_STREAM_ID };
