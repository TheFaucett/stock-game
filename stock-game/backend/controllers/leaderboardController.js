const Portfolio = require("../models/Portfolio");
const Stock = require("../models/Stock");
const { getOrGenerateSampleTickers } = require("../utils/sampleStocks"); // ⬅️ import this!

async function getLeaderboard(req, res) {
  try {
    const portfolios = await Portfolio.find({});
    if (!portfolios.length) return res.json({ leaderboard: [] });

    const sampleTickers = await getOrGenerateSampleTickers(); // Set<string>

    const stocks = await Stock.find(
      { ticker: { $in: [...sampleTickers] } },
      {
        _id: 1, ticker: 1, sector: 1, price: 1, basePrice: 1,
        volatility: 1, outstandingShares: 1, change: 1, nextEarningsTick: 1,
        history: { $slice: -10 } // adjust or make dynamic if you want
      }
    ).lean();

    if (!stocks.length) return res.status(500).json({ error: "No sampled stocks found" });

    const priceMap = Object.fromEntries(stocks.map(s => [s.ticker, s.price]));

    const leaderboard = portfolios.map(p => {
      const balance = typeof p.balance === "number" ? p.balance : Number(p.balance) || 0;

      const stockValue = Object.entries(p.ownedShares || {}).reduce((sum, [ticker, shares]) => {
        const price = priceMap[ticker] || 0;
        const qty = typeof shares === "number" ? shares : Number(shares) || 0;
        return sum + price * qty;
      }, 0);

      const netWorth = balance + stockValue;
      return {
        userId: p.userId,
        netWorth: +netWorth.toFixed(2),
        balance: +balance.toFixed(2),
        stockValue: +stockValue.toFixed(2)
      };
    });

    leaderboard.sort((a, b) => b.netWorth - a.netWorth);

    res.json({ leaderboard: leaderboard.slice(0, 10) });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getLeaderboard
};
