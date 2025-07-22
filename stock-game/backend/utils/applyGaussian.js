const Stock = require('../models/Stock');

function randNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

let macroMomentum = 0;

const applyGaussian = async () => {
  try {
    const stocks = await Stock.find();
    const baseDrift = 0.0002;
    const macroStrength = 0.007;
    const marketVolatility = 0.01;
    const maxPctChange = 0.25;

    macroMomentum += randNormal() * 0.02;
    macroMomentum = clamp(macroMomentum, -3, 3);

    const macroDrift = Math.tanh(macroMomentum) * macroStrength;
    const effectiveDrift = baseDrift + macroDrift;

    const bulkOps = [];

    for (let stock of stocks) {
      const { _id, price, volatility = 0.015 } = stock;
      const epsilon = randNormal();
      const marketNoise = randNormal();

      const rawChange = effectiveDrift + volatility * epsilon + marketVolatility * marketNoise;
      const boundedChange = clamp(rawChange, -maxPctChange, maxPctChange);
      const updatedPrice = Math.max(price * (1 + boundedChange), 0.01);

      bulkOps.push({
        updateOne: {
          filter: { _id },
          update: {
            $set: {
              price: +updatedPrice.toFixed(4),
              change: +(boundedChange * 100).toFixed(2)
            }
          }
        }
      });
    }

    if (bulkOps.length) {
      await Stock.bulkWrite(bulkOps);
      console.log(`✅ Gaussian noise applied to ${bulkOps.length} stocks.`);
    }
  } catch (error) {
    console.error("❌ Error applying Gaussian noise:", error);
  }
};

module.exports = { applyGaussian };
