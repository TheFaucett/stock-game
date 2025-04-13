// backend/utils/economicEnvironment.js
let inflationRate = 0.02; // 2% baseline
let currencyStrength = 1.0; // Neutral

function simulateEconomyShock() {
  // Random increase or decrease to simulate volatility
  inflationRate += (Math.random() - 0.5) * 0.02; // ±1%
  inflationRate = Math.max(0, inflationRate); // no negative inflation

  currencyStrength += (Math.random() - 0.5) * 0.2; // ±0.1
  currencyStrength = Math.max(0.1, Math.min(2, currencyStrength));

  console.log("💥 Economic shock occurred!", { inflationRate, currencyStrength });
}

function maybeApplyShock() {
  const shockChance = 0.025; // 5% chance per market update
  if (Math.random() < shockChance) {
    simulateEconomyShock();
  }
}

function getEconomicFactors() {
  return {
    inflationRate,
    currencyStrength
  };
}

module.exports = {
  maybeApplyShock,
  getEconomicFactors
};
