/**
 * Crisis Market Profile — simulates a bear market / financial crisis
 */
module.exports = {
  name: "crisis",

  driftAnnual: -0.10,              // 📉 negative drift to reflect declining market
  meanRevertAlpha: 0.025,          // 💣 stronger anchor pull as prices revert after panic
  baseBlend: 0.15,                 // more weight on recent prices for base updates

  volatilityBase: 0.03,            // 📈 higher baseline volatility
  volatilityClamp: [0.01, 0.07],   // wider possible volatility range
  volatilityNoise: 0.0015,         // noisier random walk
  volatilityDecay: 0.0003,         // slower reversion to normal volatility

  maxMovePerTick: 0.08,            // 🔀 allow bigger moves per tick (up/down)

  signalTail: 10,
  historyLimit: 1200,

  sectorStep: 0.0001,
  sectorClamp: 0.003,

  driftStep: 0.00004,
  driftClamp: 0.001,

  ticksPerYear: 365,
};
