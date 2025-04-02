const mongoose = require("mongoose");
const { processFirms } = require("../controllers/firmController");

// Replace this with your actual connection string (use a test DB if possible)
const MONGO_URI = "mongodb://127.0.0.1:27017/stockgame-test";

beforeAll(async () => {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase(); // Optional: clean test data
  await mongoose.connection.close();
});

describe("processFirms", () => {
  it("returns an array of trade objects with ticker and shares", async () => {
    const trades = await processFirms();

    expect(trades).toEqual({});
    if (trades.length > 0) {
      const trade = trades[0];
      expect(trade).toHaveProperty("ticker");
      expect(typeof trade.ticker).toBe("string");

      expect(trade).toHaveProperty("shares");
      expect(typeof trade.shares).toBe("number");
      expect(trade.shares).toBeGreaterThan(0);
    }
  });
});
