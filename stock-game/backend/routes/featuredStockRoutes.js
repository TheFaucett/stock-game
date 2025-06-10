// routes/featured.js
const express = require("express");
const router = express.Router();

const {
  featuredMovers,
  featuredVolatility,
  featuredMarketCap,
  featuredDividends
} = require("../controllers/featuredStocksController");

router.get("/movers", featuredMovers);
router.get("/volatility", featuredVolatility);
router.get("/marketcap", featuredMarketCap);
router.get("/dividends", featuredDividends);

module.exports = router;
