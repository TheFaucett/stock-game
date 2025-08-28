require('dotenv').config({ path: './.env.test' });
const mongoose = require('mongoose');
const TestStock = require('../models/TestStocks');
const { updateMarket } = require('../controllers/marketController');

// Connect to test DB
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Reset DB before each test
beforeEach(async () => {
  await TestStock.deleteMany({});

  await TestStock.insertMany([
    {
      ticker: 'TST1',
      price: 100,
      basePrice: 100,
      volatility: 0.02,
      history: Array(10).fill(100),
      sector: 'Tech',
      outstandingShares: 1_000_000,
      nextEarningsTick: 9999,
    },
    {
      ticker: 'TST2',
      price: 200,
      basePrice: 200,
      volatility: 0.03,
      history: Array(10).fill(200),
      sector: 'Finance',
      outstandingShares: 2_000_000,
      nextEarningsTick: 9999,
    }
  ]);
});

// Disconnect from DB
afterAll(async () => {
  await mongoose.connection.close();
});

test('updateMarket modifies prices and history after 1 tick', async () => {
  const before = await TestStock.find({}).lean();

  await updateMarket();

  const after = await TestStock.find({}).lean();
  expect(after.length).toBe(before.length);

  for (let i = 0; i < after.length; i++) {
    const b = before[i];
    const a = after[i];

    expect(a.price).not.toBe(undefined);
    expect(Array.isArray(a.history)).toBe(true);
    expect(a.history.length).toBeGreaterThan(0);
    expect(a.history.at(-1)).toBeCloseTo(a.price, 2);
  }
});

test('prices grow over time with drift (approx 12% annual)', async () => {
  const prices = [];

  for (let i = 0; i < 365; i++) {
    await updateMarket();
    const s = await TestStock.findOne({ ticker: 'TST1' }).lean();
    prices.push(s.price);
  }

  const first = prices[0];
  const last = prices.at(-1);
  const growth = (last - first) / first;

  console.log(`Growth over 365 ticks: ${(growth * 100).toFixed(2)}%`);

  expect(growth).toBeGreaterThan(0.06);
  expect(growth).toBeLessThan(0.20);
});

test('prevents extreme price spikes or crashes beyond sanity limits', async () => {
  // Inject a volatile stock for edge testing
  await TestStock.create({
    ticker: 'VOLATILE',
    price: 100,
    basePrice: 100,
    volatility: 0.99, // very high
    history: Array(10).fill(100),
    sector: 'Meme',
    outstandingShares: 500_000,
    nextEarningsTick: 9999
  });

  for (let i = 0; i < 20; i++) {
    await updateMarket();
  }

  const s = await TestStock.findOne({ ticker: 'VOLATILE' }).lean();
  console.log(`Final price after 20 volatile ticks: $${s.price.toFixed(2)}`);

  // The clamp logic should prevent this from exploding
  expect(s.price).toBeGreaterThan(0.5);      // not collapsed
  expect(s.price).toBeLessThan(2000);        // not exploded
});
