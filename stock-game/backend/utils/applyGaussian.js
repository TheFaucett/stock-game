const { addSet } = require('./patchKit');

// --- small helpers ---
function randNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

// --- persistent macro state (module scoped) ---
let macroMomentum = 0;

// --- tuning knobs (safe defaults) ---
const VOL_MIN = 0.015;          // keep in step with your main model
const VOL_MAX = 0.25;
const MACRO_STEP_SIGMA = 0.02;  // size of the macro random-walk step
const MACRO_STRENGTH   = 0.15;  // how strongly macro affects vol (±15%)
const NOISE_VOL_KICK   = 0.002; // tiny additive vol “breathing”

/**
 * gaussianPatches(stocks)
 * @param {Array<LeanStock>} stocks - lean docs you already fetched this tick
 * @returns {Map<ObjectId, UpdateDoc>}
 *
 * Note: We adjust ONLY `volatility`. We do NOT touch `price` here to avoid
 * conflicts with your core price engine & history push.
 */
async function gaussianPatches(stocks = []) {
  const patches = new Map();
  if (!Array.isArray(stocks) || stocks.length === 0) return patches;

  // 1) evolve macro momentum (bounded random walk)
  macroMomentum = clamp(macroMomentum + randNormal() * MACRO_STEP_SIGMA, -3, 3);

  // 2) translate momentum -> macro multiplier via tanh for smooth bounds
  const macroFactor = 1 + Math.tanh(macroMomentum) * MACRO_STRENGTH; // ~[0.85, 1.15]

  // 3) per-stock volatility tweak
  for (const s of stocks) {
    const id = s._id;
    if (!id) continue;

    const v0 = (typeof s.volatility === 'number') ? s.volatility : 0.018;
    const epsilon = Math.abs(randNormal()); // idiosyncratic non-negative kick

    let v1 = v0 * macroFactor + NOISE_VOL_KICK * epsilon;
    v1 = clamp(+v1.toFixed(4), VOL_MIN, VOL_MAX);

    if (v1 !== v0) {
      addSet(patches, id, { volatility: v1 });
    }
  }

  return patches;
}

module.exports = { gaussianPatches };
