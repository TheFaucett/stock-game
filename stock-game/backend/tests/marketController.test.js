require('dotenv').config({ path: './.env.test' }); // uses test env variables
const mongoose = require('mongoose');
const TestStock = require('../models/TestStocks');
const { updateMarket } = require('../controllers/marketController');

// Connect to test DB before all tests
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up before each test
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
      nextEarningsTick: 9999 // effectively disables earnings
    },
    {
      ticker: 'TST2',
      price: 200,
      basePrice: 200,
      volatility: 0.03,
      history: Array(10).fill(200),
      sector: 'Finance',
      outstandingShares: 2_000_000,
      nextEarningsTick: 9999
    }
  ]);
});

// Close DB after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

test('updateMarket modifies prices and records history', async () => {
  const before = await TestStock.find({}).lean();

  await updateMarket(); // Run a tick

  const after = await TestStock.find({}).lean();

  expect(after.length).toBe(before.length);

  for (let i = 0; i < after.length; i++) {
    const b = before[i];
    const a = after[i];

    expect(a.price).not.toBe(b.price); // price changed
    expect(Array.isArray(a.history)).toBe(true);
    expect(a.history.length).toBeGreaterThan(0);
    expect(a.history.at(-1)).toBeCloseTo(a.price, 2); // latest price matches history
  }
  test('prices grow over time with drift', async () => {
    let priceHistory = [];

    for (let i = 0; i < 365; i++) {
      await updateMarket();
      const s = await TestStock.findOne({ ticker: 'TST1' }).lean();
      priceHistory.push(s.price);
   }

    const first = priceHistory[0];
    const last = priceHistory.at(-1);
    const growth = (last - first) / first;

    // Expect roughly 12% annual drift +/- variance
    expect(growth).toBeGreaterThan(0.06);
    expect(growth).toBeLessThan(0.20);
  });

});
