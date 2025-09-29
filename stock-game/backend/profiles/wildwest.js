/**
 * Wild West Market Profile — chaotic and unpredictable
 */
module.exports = {
  name: "wildwest",

  driftAnnual: 0.06,                // Slight overall upward drift
  meanRevertAlpha: 0.008,           // Very weak anchor pull — fundamentals matter little
  baseBlend: 0.05,                  // Base price lags a bit, but adjusts faster than bubble

  volatilityBase: 0.035,            // ⚠️ Extremely volatile
  volatilityClamp: [0.02, 0.08],    // Wild swings allowed
  volatilityNoise: 0.002,
  volatilityDecay: 0.0003,

  maxMovePerTick: 0.1,              // 🧨 Very large daily swings

  signalTail: 10,
  historyLimit: 1200,

  sectorStep: 0.0002,               // Sectors can diverge hard
  sectorClamp: 0.004,

  driftStep: 0.0001,
  driftClamp: 0.0015,

  ticksPerYear: 365,

  // 🔥 Optional: Sector Chaos
  sectorBias: {
    mining: 0.04,         // ⛏️ Mining/commodities do well
    biotech: -0.02,       // 💊 Biotech collapses often
    crypto: 0.07,         // 🪙 If supported, crypto goes nuts
    finance: -0.03        // 💸 Finance is unreliable
  }
};
