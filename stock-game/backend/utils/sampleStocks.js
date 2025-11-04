const Stock = require('../models/Stock');
const SystemConfig = require('../models/SystemConfig');

const SAMPLE_KEY = 'sampleTickers';

async function getOrGenerateSampleTickers(count = 50) {
  const existing = await SystemConfig.findOne({ key: SAMPLE_KEY });
  if (existing) return new Set(existing.value);

  const tickers = await Stock.find().select('ticker -_id').lean();
  const all = tickers.map(s => s.ticker);
  const shuffled = all.sort(() => 0.5 - Math.random());
  const picked = shuffled.slice(0, count);

  await SystemConfig.create({ key: SAMPLE_KEY, value: picked });
  return new Set(picked);
}

module.exports = { getOrGenerateSampleTickers };
