const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const { getLastDividendSummary } = require('../utils/payDividends');
const { getMegaCaps } = require('../utils/megaCaps');
const { lttb } = require('../utils/lttb.js'); // <- use this one

// ---- tiny helpers ----
const clamp = (n, lo, hi) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo;
};
const parseList = (s) =>
  String(s || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

// ===============================
// SUMMARIES (small payload)
// GET /api/stocks?fields=ticker,price,change,sector&page=1&pageSize=200&sort=-marketCap
// Defaults to a compact safe subset if fields not provided.
// ===============================
router.get('/', async (req, res) => {
  try {
    // Defaults that keep payload tiny
    const defaultFields = ['ticker','price','change','sector','peRatio','dividendYield','outstandingShares', 'volatility'];
    const fields = parseList(req.query.fields).length ? parseList(req.query.fields) : defaultFields;

    // Prevent accidental history dump via fields param
    const safeFields = fields.filter(f => f !== 'history' && f !== '__v');

    const pageSize = clamp(parseInt(req.query.pageSize, 10) || 200, 1, 500);
    const page = clamp(parseInt(req.query.page, 10) || 1, 1, 1000000);
    const sort = String(req.query.sort || '-outstandingShares'); // cheap proxy for size; adjust as needed

    const projection = {};
    safeFields.forEach(f => projection[f] = 1);

    // Add computed marketCap if asked in fields
    const needMarketCap = safeFields.includes('marketCap');

    let query = Stock.find({}, projection).sort(sort).skip((page - 1) * pageSize).limit(pageSize).lean();

    let stocks = await query;

    // Computed fields & rounding
    stocks = stocks.map(s => {
      const out = { ...s };
      if (typeof out.price === 'number') out.price = +out.price.toFixed(2);
      if (typeof out.change === 'number') out.change = +out.change.toFixed(2);
      if (typeof out.peRatio === 'number') out.peRatio = +out.peRatio.toFixed(2);
      if (typeof out.dividendYield === 'number') out.dividendYield = +out.dividendYield.toFixed(4);
      if (needMarketCap) {
        const sh = Number(out.outstandingShares) || 0;
        const px = Number(out.price) || 0;
        out.marketCap = +(px * sh).toFixed(2);
      }
      // NEVER attach history here
      delete out.history;
      delete out.__v;
      return out;
    });

    // Optional total count for pagination UI
    const includeCount = req.query.count === '1';
    if (includeCount) {
      const total = await Stock.countDocuments({});
      res.setHeader('X-Total-Count', String(total));
    }

    // Small, cacheable-ish
    res.setHeader('Cache-Control', 'public, max-age=5'); // tiny TTL
    return res.json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Error fetching stocks' });
  }
});

// ===============
// Last dividend
// ===============
router.get('/last-dividend', (req, res) => {
  const { userId } = req.query;
  const summary = getLastDividendSummary(userId);
  res.json(summary);
});

// ===============
// Heatmap data
// ===============
router.get('/heatmap', async (req, res) => {
  try {
    const pipeline = [
      { $project: {
          ticker: 1, sector: 1, price: 1, change: 1, outstandingShares: 1,
          marketCap: { $multiply: ["$price", "$outstandingShares"] }
      }},
      { $sort: { marketCap: -1 } },
      { $limit: 150 },
      { $group: {
          _id: "$sector",
          totalMarketCap: { $sum: "$marketCap" },
          stocks: {
            $push: { ticker: "$ticker", price: "$price", change: "$change", marketCap: "$marketCap" }
          }
      }},
      { $sort: { totalMarketCap: -1 } }
    ];
    const sectors = await Stock.aggregate(pipeline);
    const heatmapData = sectors.map(s => ({
      name: s._id,
      value: s.totalMarketCap,
      children: s.stocks.map(x => ({ name: x.ticker, value: x.marketCap, change: x.change }))
    }));
    res.json({ success: true, heatmapData });
  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    res.status(500).json({ success: false, message: "Error fetching heatmap" });
  }
});

router.get('/sector-heatmap', async (_req, res) => {
  try {
    const sectorData = await Stock.aggregate([
      { $group: {
          _id: "$sector",
          totalMarketCap: { $sum: { $multiply: ["$price", "$outstandingShares"] } },
          avgChange: { $avg: "$change" },
          count: { $sum: 1 }
      }},
      { $sort: { totalMarketCap: -1 } }
    ]);
    res.json({ success: true, sectors: sectorData });
  } catch (error) {
    console.error("❌ Error fetching sector heatmap data:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.get('/mega-caps', (_req, res) => {
  const { megaCaps, selectionTick } = getMegaCaps();
  res.json({ megaCaps, selectionTick });
});

// ===============================
// HISTORY (downsampled/tail)
// GET /api/stocks/:ticker/history?tail=720&maxPoints=150
// ===============================
router.get('/:ticker/history', async (req, res) => {
  try {
    const ticker = String(req.params.ticker || '').toUpperCase();
    let tail = parseInt(req.query.tail, 10);
    let maxPoints = parseInt(req.query.maxPoints, 10);

    if (!Number.isFinite(tail) || tail <= 0) tail = 300;
    if (!Number.isFinite(maxPoints) || maxPoints <= 0) maxPoints = 300;

    const doc = await Stock.findOne(
      { ticker },
      { ticker: 1, history: 1 }
    ).lean();

    if (!doc) return res.status(404).json({ error: 'Stock not found', ticker });

    const hist = (Array.isArray(doc.history) ? doc.history : [])
      .map(Number)
      .filter(Number.isFinite);

    if (hist.length === 0) {
      return res.json({ ticker, points: [], meta: { tail: 0, returned: 0, overallTotal: 0 } });
    }

    tail = clamp(tail, 1, hist.length);
    maxPoints = clamp(maxPoints, 2, tail);

    const tailSlice = hist.slice(-tail);
    let points = tailSlice;

    if (maxPoints < tailSlice.length) {
      try {
        // Your util returns array of { x, y } or just y?
        // Assume y-only for simplicity; if it returns objects, map to y.
        const ds = lttb(tailSlice, maxPoints); // <- use the imported helper
        points = Array.isArray(ds)
          ? (typeof ds[0] === 'number' ? ds : ds.map(p => p.y))
          : tailSlice.slice(tailSlice.length - maxPoints);
      } catch (e) {
        console.warn('⚠️ LTTB failed, falling back slice', { ticker, err: e?.message });
        points = tailSlice.slice(tailSlice.length - maxPoints);
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=5');
    return res.json({
      ticker,
      points,
      meta: {
        tail,
        returned: points.length,
        overallTotal: hist.length
      }
    });
  } catch (err) {
    console.error('🔥 /:ticker/history error', {
      url: req.originalUrl,
      err: err?.stack || err?.message || String(err),
    });
    res.status(500).json({ error: 'Internal error in history route' });
  }
});

// ===============================
// SINGLE TICKER (no history)
// ===============================
router.get('/:ticker([A-Za-z0-9]{1,8})', async (req, res) => {
  try {
    const stock = await Stock.findOne(
      { ticker: req.params.ticker.toUpperCase() },
      { __v: 0, history: 0 } // <- explicitly exclude history here
    ).lean();
    if (!stock) return res.status(404).json({ error: "Stock not found" });

    // Round a couple for UI niceness
    if (typeof stock.price === 'number') stock.price = +stock.price.toFixed(2);
    if (typeof stock.change === 'number') stock.change = +stock.change.toFixed(2);
    if (typeof stock.peRatio === 'number') stock.peRatio = +stock.peRatio.toFixed(2);
    if (typeof stock.dividendYield === 'number') stock.dividendYield = +stock.dividendYield.toFixed(4);

    res.json(stock);
  } catch (err) {
    console.error('🔥 /:ticker error', err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
