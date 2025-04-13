const { updateMarket, getMarketMoodController } = require("../controllers/marketController");
const Stock = require("../models/Stock");

jest.mock("../models/Stock");
jest.mock("../controllers/newsImpactController", () => ({
  applyImpactToStocks: jest.fn(),
}));
jest.mock("../utils/applyGaussian.js", () => ({
  applyGaussian: jest.fn(),
}));
jest.mock("../controllers/firmController", () => ({
  processFirms: jest.fn(() => Promise.resolve({})),
}));
jest.mock("../utils/getMarketMood.js", () => {
  let moodHistory = [];
  return {
    recordMarketMood: jest.fn(() => 0.75),
    getMoodHistory: jest.fn(() => moodHistory),
  };
});
jest.mock("../utils/economicEnvironment.js", () => ({
  maybeApplyShock: jest.fn(),
  getEconomicFactors: jest.fn(() => ({
    inflationRate: 0.01,
    currencyStrength: 1,
  })),
}));

describe("marketController", () => {
  afterEach(() => jest.clearAllMocks());

  describe("updateMarket", () => {
    it("should run the full market update flow and call Stock.bulkWrite", async () => {
      Stock.find.mockResolvedValue([
        {
          _id: "123",
          ticker: "TEST",
          price: 100,
          history: [100],
          volatility: 0.05,
          liquidity: 0.5,
        },
      ]);
      Stock.bulkWrite = jest.fn();

      await updateMarket();

      expect(Stock.find).toHaveBeenCalled();
      expect(Stock.bulkWrite).toHaveBeenCalled();
    });

    it("should log and return early if no stocks found", async () => {
      const logSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      Stock.find.mockResolvedValue([]);

      await updateMarket();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No stocks found"));
      logSpy.mockRestore();
    });
  });

  describe("getMarketMoodController", () => {
    it("should return the latest mood and mood history", async () => {
      const req = {};
      const res = {
        json: jest.fn(),
      };

      await getMarketMoodController(req, res);

      expect(res.json).toHaveBeenCalledWith({
        mood: expect.any(String),
        moodHistory: expect.any(Array),
      });
    });
  });
});
