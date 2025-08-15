// routes/marketData.js
const express = require("express");
const router = express.Router();
const { getMarketMoodController } = require("../controllers/marketController");
const { getMarketIndexHistory } = require("../utils/marketIndex.js");
const { getMoodHistory } = require("../utils/getMarketMood.js");
const { lttb } = require("../utils/lttb.js");

const clamp = (n, lo, hi) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo;
};

// routes/marketData.js
router.get("/index", (req, res) => {
  try {
    const full = getMarketIndexHistory();          // number[] or object[]
    const all  = Array.isArray(full) ? full.slice() : [];

    // If objects, ensure chronological order first (oldest → newest)
    if (all.length && typeof all[0] === "object") {
      const lower = (k) => k.toLowerCase();
      const keys  = Object.keys(all[0]).reduce((m, k) => (m[lower(k)] = k, m), {});
      const xKey  = ["timestamp","tick","ts","t","x"].find(k => keys[k]) ? keys[["timestamp","tick","ts","t","x"].find(k => keys[k])] : null;
      if (xKey) all.sort((a, b) => (a[xKey] ?? 0) - (b[xKey] ?? 0));
    }

    // Always take the LAST N (latest N)
    const tail      = Math.min(Math.max(1, +req.query.tail || 30), 1_000_000);
    const maxPoints = Math.min(Math.max(1, +req.query.maxPoints || tail), tail);
    const window    = all.slice(-tail);            // ← last N points

    // For small windows, skip LTTB so you truly get 5 / 30 points
    let points = window;
    if (window.length > maxPoints && tail > 30) {
      const { lttb } = require("../utils/lttb");
      points = lttb(window, maxPoints, req.query.xKey, req.query.yKey);
    }

    res.setHeader("Cache-Control", "public, max-age=5");
    res.json({
      points,
      meta: {
        method: points === window ? "none" : "LTTB",
        overallTotal: all.length,
        window: window.length,
        returned: points.length,
        maxPoints,
        tail
      }
    });
  } catch (err) {
    console.error("🔥 Error fetching market index history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/mood", (req, res) => {
  try {
    const limit = clamp(req.query.limit ?? 120, 1, 5_000);
    const maxPointsReq = req.query.maxPoints ? clamp(req.query.maxPoints, 1, limit) : null;

    const full = getMoodHistory(); // [{ mood, value, timestamp }, ...]
    const window = Array.isArray(full) ? full.slice(-limit) : [];

    let moodSeries = window;
    let method = "none";

    if (maxPointsReq && window.length > maxPointsReq) {
      moodSeries = lttb(window, maxPointsReq, "timestamp", "value");
      method = "LTTB";
    }

    const latest = moodSeries.at(-1) || window.at(-1);
    const mood = latest?.mood || "neutral";
    const value = latest?.value ?? 0.5;

    res.setHeader("Cache-Control", "public, max-age=5");
    res.json({
      mood,
      value,
      moodHistory: moodSeries,
      meta: {
        method,
        returned: moodSeries.length,
        overallTotal: full?.length ?? 0,
        limit,
        maxPoints: maxPointsReq ?? null
      }
    });
  } catch (err) {
    console.error("🔥 Error fetching mood:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
