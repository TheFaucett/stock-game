// routes/marketRoutes.js
const express = require("express");
const router = express.Router();
const { getMarketMoodController } = require("../controllers/marketController");
const { getMarketIndexHistory } = require("../utils/marketIndex.js");


router.get("/index", (req, res) => {
  res.json(getMarketIndexHistory());
});
router.get("/mood", getMarketMoodController);

module.exports = router;
