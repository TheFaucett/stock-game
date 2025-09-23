/**
 * Communist / Restricted Market Profile
 * -------------------------------------
 * Simulates a tightly regulated, state-controlled market system.
 * Key features:
 * - Low volatility (limited speculation)
 * - Low drift (minimal growth)
 * - Sector biases (state-favored industries like energy/utilities)
 * - Suppressed tech sector
 * - Reduced market cap variability
 */

module.exports = {
  name: "communist",

  // 🧭 Economic Movement
  driftAnnual: 0.005,            // ~0.5% annual drift
  meanRevertAlpha: 0.05,         // Stronger pull toward anchor
  baseBlend: 0.03,               // Less price discovery

  // 🎢 Volatility
  volatilityBase: 0.008,
  volatilityClamp: [0.005, 0.015],
  volatilityNoise: 0.0002,
  volatilityDecay: 0.002,

  maxMovePerTick: 0.02,

  // 🕰️ Simulation params
  signalTail: 8,
  historyLimit: 800,
  ticksPerYear: 365,

  // 🧪 Drift randomness (per-stock or per-sector trends)
  sectorStep: 0.00001,
  sectorClamp: 0.0002,
  driftStep: 0.000005,
  driftClamp: 0.0001,

  // 🧠 State-favored sector bias (e.g., energy, utilities)
  sectorBias: {
    energy: 0.02,
    utilities: 0.015,
    tech: -0.04,
    consumer: -0.01,
    industrials: 0.01,
    financials: -0.005
  }
};
