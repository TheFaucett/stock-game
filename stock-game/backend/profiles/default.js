/**
 * Default Market Profile — used for normal tick behavior
 */
module.exports = {
  name: "default",

  driftAnnual: 0.04,              // annual drift
  meanRevertAlpha: 0.015,         // strength of anchor pull
  baseBlend: 0.1,                 // blend for evolving base price

  volatilityBase: 0.015,          // base vol used in fallback
  volatilityClamp: [0.005, 0.03],
  volatilityNoise: 0.0005,
  volatilityDecay: 0.001,

  maxMovePerTick: 0.04,

  signalTail: 10,
  historyLimit: 1200,

  sectorStep: 0.00005,
  sectorClamp: 0.001,

  driftStep: 0.00002,
  driftClamp: 0.0005,

  ticksPerYear: 365,
};
