const { Router } = require("express");
const { query } = require("../config/postgres");

const router = Router();

// GET /api/stats/live — latest snapshot across all active streams
router.get("/live", async (_req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM v_stream_live_stats LIMIT 10`);
    res.json({ streams: rows, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/history/:streamId — last N snapshots for charting
router.get("/history/:streamId", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 60, 300);
    const { rows } = await query(
      `SELECT concurrent_viewers, buffering_rate, avg_bitrate_kbps,
              engagement_score, captured_at
       FROM analytics_snapshots
       WHERE stream_id = $1
       ORDER BY captured_at DESC
       LIMIT $2`,
      [req.params.streamId, limit]
    );
    res.json({ history: rows.reverse() }); // chronological order
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/alerts/:streamId — recent alerts
router.get("/alerts/:streamId", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM alerts
       WHERE stream_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.params.streamId]
    );
    res.json({ alerts: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
