const {
  getTopMovers,
  getMostVolatileStocks,
  getTopMarketCapStocks,
  getTopDividendYieldStocks
} = require("../utils/featuredStocks");

async function featuredMovers(req, res) {
  try {
    const movers = await getTopMovers();
    res.json({ success: true, movers });
  } catch (err) {
    console.error("Error in featuredMovers:", err);
    res.status(500).json({ success: false, message: "Error fetching biggest movers." });
  }
}

async function featuredVolatility(req, res) {
  try {
    const volatile = await getMostVolatileStocks();
    res.json({ success: true, volatile });
  } catch (err) {
    console.error("Error in featuredVolatility:", err);
    res.status(500).json({ success: false, message: "Error fetching most volatile stocks." });
  }
}

async function featuredMarketCap(req, res) {
  try {
    const topCap = await getTopMarketCapStocks();
    res.json({ success: true, topCap });
  } catch (err) {
    console.error("Error in featuredMarketCap:", err);
    res.status(500).json({ success: false, message: "Error fetching top market cap stocks." });
  }
}

async function featuredDividends(req, res) {
  try {
    const topYield = await getTopDividendYieldStocks();
    res.json({ success: true, topYield });
  } catch (err) {
    console.error("Error in featuredDividends:", err);
    res.status(500).json({ success: false, message: "Error fetching top dividend yield stocks." });
  }
}

module.exports = {
  featuredMovers,
  featuredVolatility,
  featuredMarketCap,
  featuredDividends
};
