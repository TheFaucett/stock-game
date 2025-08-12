// utils/getMarketMood.js
let moodHistory = [];

// Rolling baseline for de-drifting (EMA)
let emaMean = 0;          // avg market return (decimal)
let emaAbs  = 1e-6;       // avg absolute return (decimal)

// Slow regime state (lets mood "walk")
let regime = 0;           // in [-REGIME.MAX, REGIME.MAX]

// 🔧 knobs
const CFG = {
  // baseline / de-drift
  EMA_BETA: 0.20,         // higher = adapts faster to regime changes
  DEAD_ZONE_MULT: 0.20,   // % of vol ignored as noise for breadth
  // mixing
  BREADTH_GAIN: 3.0,
  MEAN_WEIGHT: 0.5,
  BREADTH_WEIGHT: 0.5,
  INERTIA_NEW: 0.60,      // new score vs previous (0.55–0.7)

  // regime "walkiness"
  REGIME: {
    DECAY: 0.995,         // closer to 1 = longer memory (half-life ~ ln(0.5)/ln(DECAY))
    GAIN: 0.02,           // how much new signal nudges regime
    NOISE: 0.004,         // small random drift per tick (stddev in raw units)
    MAX: 0.25,            // cap regime contribution (so mood can't stick at 0/1)
  },
};

function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
function randn() {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function labelFromScore(score) {
  if (score > 0.66) return "bullish";
  if (score > 0.55) return "slightly bullish";
  if (score < 0.33) return "bearish";
  if (score < 0.45) return "slightly bearish";
  return "neutral";
}

/**
 * stocks[i].change must be PERCENT per tick (e.g., +0.0234 for +0.0234%)
 * We de-drift by subtracting EMA of market return, then combine mean+breadth,
 * then add a slow regime component that can "walk".
 */
function recordMarketMood(stocks = []) {
  if (!Array.isArray(stocks) || stocks.length === 0) return 0.5;

  // % → decimal
  const dec = stocks.map(s =>
    typeof s.change === "number" && Number.isFinite(s.change) ? s.change / 100 : 0
  );

  // aggregates
  const N = dec.length;
  const avg = dec.reduce((a, b) => a + b, 0) / N;
  const absMean = dec.reduce((a, b) => a + Math.abs(b), 0) / N || 1e-9;

  // update baselines
  emaMean = (1 - CFG.EMA_BETA) * emaMean + CFG.EMA_BETA * avg;
  emaAbs  = (1 - CFG.EMA_BETA) * emaAbs  + CFG.EMA_BETA * absMean;

  // normalized mean (de-drifted & scaled by vol)
  const normAvg = (avg - emaMean) / (emaAbs * 0.8 + 1e-9);

  // breadth on de-drifted returns with dead-zone
  const DEAD = Math.max(emaAbs * CFG.DEAD_ZONE_MULT, 0.00002);
  let up = 0, down = 0;
  for (const v of dec) {
    const d = v - emaMean;
    if (d >  DEAD) up++;
    else if (d < -DEAD) down++;
  }
  const breadth = (up - down) / N; // [-1, 1]

  // bounded instantaneous signal
  const meanPart    = Math.tanh(normAvg);                 // [-1, 1]
  const breadthPart = Math.tanh(breadth * CFG.BREADTH_GAIN);
  const instRaw     = CFG.MEAN_WEIGHT * meanPart + CFG.BREADTH_WEIGHT * breadthPart; // [-1,1]

  // --- slow regime: AR(1) with tiny noise, nudged by instant signal
  const noise = CFG.REGIME.NOISE * randn();
  regime  = clamp(
    CFG.REGIME.DECAY * regime + CFG.REGIME.GAIN * instRaw + noise,
    -CFG.REGIME.MAX,
    CFG.REGIME.MAX
  );

  // combine instantaneous signal + regime drift, then bound
  const raw = clamp(instRaw + regime, -1, 1);
  const score = 0.5 + raw * 0.5;  // [0,1]

  // light inertia on the final score
  const prev = moodHistory.at(-1)?.value ?? 0.5;
  const blended = CFG.INERTIA_NEW * score + (1 - CFG.INERTIA_NEW) * prev;

  const moodLabel = labelFromScore(blended);
  moodHistory.push({ mood: moodLabel, value: +blended.toFixed(4), timestamp: Date.now() });
  if (moodHistory.length > 120) moodHistory = moodHistory.slice(-120);

  return blended;
}

function getMoodHistory() { return moodHistory; }
module.exports = { recordMarketMood, getMoodHistory };
