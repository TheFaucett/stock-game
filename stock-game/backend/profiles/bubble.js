/**
 * Bubble Market Profile — simulates a speculative mania
 */
module.exports = {
  name: "bubble",

  driftAnnual: 0.20,               // 🚀 Very strong upward drift (unsustainable growth)
  meanRevertAlpha: 0.007,          // 🧲 Weak anchor pull — prices float away from fundamentals
  baseBlend: 0.03,                 // Base price adapts slowly (delayed realism)

  volatilityBase: 0.02,            // Volatile but not chaotic...yet
  volatilityClamp: [0.01, 0.05],
  volatilityNoise: 0.001,
  volatilityDecay: 0.0005,

  maxMovePerTick: 0.06,            // Larger spikes allowed

  signalTail: 10,
  historyLimit: 1200,

  sectorStep: 0.00008,             // Sector divergence increases
  sectorClamp: 0.002,

  driftStep: 0.00005,
  driftClamp: 0.001,

  ticksPerYear: 365,
};
