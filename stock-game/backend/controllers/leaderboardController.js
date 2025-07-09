const Portfolio = require("../models/Portfolio");
const Stock = require("../models/Stock");

async function getLeaderboard(req, res) {
  try {
    const portfolios = await Portfolio.find({});
    const stocks = await Stock.find({}, "ticker price");
    const priceMap = Object.fromEntries(stocks.map(s => [s.ticker, s.price]));

    const leaderboard = portfolios.map(p => {
      // Defensive type conversion
      const balance = typeof p.balance === "number" ? p.balance : Number(p.balance) || 0;
      const stockValue = Object.entries(p.ownedShares || {}).reduce(
        (sum, [ticker, shares]) =>
          sum + (priceMap[ticker] || 0) * (typeof shares === "number" ? shares : Number(shares) || 0),
        0
      );
      const netWorth = balance + stockValue;
      return {
        userId: p.userId,
        netWorth: +netWorth.toFixed(2),
        balance: +balance.toFixed(2),
        stockValue: +stockValue.toFixed(2)
      };
    });

    leaderboard.sort((a, b) => b.netWorth - a.netWorth);
    console.log("DEBUG LEADERBOARD:", leaderboard);

    res.json({ leaderboard: leaderboard.slice(0, 10) });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
module.exports = {
  getLeaderboard    
};