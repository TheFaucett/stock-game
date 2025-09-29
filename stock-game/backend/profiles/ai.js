/**
 * AI Automation Boom — simulates a market driven by rapid technological disruption
 * Highlights sectoral inequality, rapid growth, and volatility in affected industries
 */

module.exports = {
  name: "ai",

  // 📈 Strong growth, especially in tech
  driftAnnual: 0.08,              // faster upward drift
  meanRevertAlpha: 0.01,          // weaker mean reversion (momentum)
  baseBlend: 0.12,                // slightly faster base adjustment

  // 🎢 Moderate volatility with innovation risk
  volatilityBase: 0.018,
  volatilityClamp: [0.007, 0.04],
  volatilityNoise: 0.0007,
  volatilityDecay: 0.0005,

  maxMovePerTick: 0.05,

  signalTail: 10,
  historyLimit: 1200,

  sectorStep: 0.00007,
  sectorClamp: 0.002,

  driftStep: 0.00003,
  driftClamp: 0.0007,

  ticksPerYear: 365,

  // 🤖 Sectoral winners and losers
  marketModifiers: {
    sectorBias: {
      tech: 0.05,         // AI companies surge
      finance: 0.01,      // Fintech and automation
      utilities: 0.01,    // More stable, less affected

      consumer: -0.02,    //ecommerce and layoffs
      energy: -0.015,        // Stable but overshadowed
    },
  },
};
