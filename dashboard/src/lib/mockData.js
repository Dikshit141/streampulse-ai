// Generates realistic mock data so the dashboard works 100% offline
// Toggle via the "Mock Mode" button in the header

const STREAM_ID = "00000000-0000-0000-0000-000000000001";

let tick = 0;
let viewerBase = 42800;
let viewerDelta = 0;
let bufferPressure = 0;

function rnd(min, max) { return min + Math.random() * (max - min); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

export function generateMockStats() {
  tick++;

  // Viewer random walk with occasional spikes
  viewerDelta += (Math.random() - 0.5) * 300;
  viewerDelta *= 0.93;
  if (Math.random() < 0.008) viewerDelta += rnd(2000, 5000);

  const viewers = Math.round(clamp(viewerBase + viewerDelta, 5000, 90000));

  // Buffering pressure
  if (Math.random() < 0.03) bufferPressure = rnd(0.15, 0.55);
  bufferPressure *= 0.96;
  const buffering = clamp(bufferPressure + rnd(0, 0.04), 0, 0.99);

  const bitrate     = rnd(1800, 4500);
  const watchPct    = rnd(0.45, 0.92);
  const engagement  = clamp((1 - buffering) * 0.4 + watchPct * 0.5 + rnd(0, 0.1), 0, 1);

  return {
    stream_id:          STREAM_ID,
    concurrent_viewers: viewers,
    buffering_rate:     parseFloat(buffering.toFixed(4)),
    avg_bitrate_kbps:   parseFloat(bitrate.toFixed(0)),
    watch_percentage:   parseFloat(watchPct.toFixed(4)),
    engagement_score:   parseFloat(engagement.toFixed(4)),
    time_of_day_hour:   new Date().getHours(),
    drop_probability:   null,
    captured_at:        new Date().toISOString(),
  };
}

export function generateMockHistory(points = 60) {
  const history = [];
  let v = 40000, b = 0.05, e = 0.72;
  const now = Date.now();

  for (let i = points; i >= 0; i--) {
    v = clamp(v + rnd(-500, 600), 5000, 90000);
    b = clamp(b + rnd(-0.02, 0.025), 0, 0.8);
    e = clamp(e + rnd(-0.03, 0.03), 0, 1);
    history.push({
      concurrent_viewers: Math.round(v),
      buffering_rate:     parseFloat(b.toFixed(4)),
      engagement_score:   parseFloat(e.toFixed(4)),
      captured_at:        new Date(now - i * 5000).toISOString(),
    });
  }
  return history;
}

export function generateMockMoments(count = 5) {
  const labels = ["Goal Scored ⚽", "Wicket! 🏏", "Boundary Hit 🏏", "Penalty Awarded", "Half Time", "Controversy 🔥", "Crowd Erupts"];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    stream_id: STREAM_ID,
    detected_at: new Date(now - i * rnd(60000, 300000)).toISOString(),
    viewer_count: Math.round(rnd(38000, 75000)),
    spike_pct: parseFloat(rnd(20, 65).toFixed(1)),
    label: labels[Math.floor(Math.random() * labels.length)],
    is_replay_worthy: true,
  }));
}

export function generateMockAlerts(count = 4) {
  const types = [
    { alert_type: "high_drop_risk", severity: "warning",  message: "Drop risk at 68% — recommend CDN scale-out" },
    { alert_type: "buffer_spike",   severity: "critical", message: "Buffering rate at 42% — viewers experiencing degraded quality" },
    { alert_type: "trending",       severity: "info",     message: "Viewer spike detected — 31% increase in 60 seconds" },
    { alert_type: "buffer_spike",   severity: "warning",  message: "Buffering rate at 27% — monitor closely" },
    { alert_type: "high_drop_risk", severity: "critical", message: "Drop risk at 84% — immediate action required" },
  ];
  const now = Date.now();
  return types.slice(0, count).map((a, i) => ({
    ...a,
    id: i + 1,
    stream_id: STREAM_ID,
    created_at: new Date(now - i * rnd(30000, 120000)).toISOString(),
  }));
}

export function generateMockSentiment() {
  const p = rnd(0.45, 0.75);
  const n = rnd(0.05, 0.20);
  const neu = parseFloat((1 - p - n).toFixed(4));
  return {
    positive: parseFloat(p.toFixed(4)),
    neutral:  parseFloat(Math.max(0, neu).toFixed(4)),
    negative: parseFloat(n.toFixed(4)),
  };
}

export function generateMockDropPrediction(bufferingRate, engagementScore) {
  const raw = clamp(
    0.15 + bufferingRate * 0.5 + (1 - engagementScore) * 0.25 + rnd(-0.05, 0.05),
    0.05, 0.97
  );
  const prob = parseFloat(raw.toFixed(4));
  const risk = prob < 0.3 ? "low" : prob < 0.55 ? "medium" : prob < 0.75 ? "high" : "critical";
  return { drop_probability: prob, risk_level: risk, confidence: parseFloat(rnd(0.72, 0.96).toFixed(4)) };
}

export { STREAM_ID };
