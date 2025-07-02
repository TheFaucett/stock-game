// routes/marketRoutes.js
const express = require("express");
const router = express.Router();
const { getMarketMoodController } = require("../controllers/marketController");
const { getMarketIndexHistory } = require("../utils/marketIndex.js");


router.get("/index", (req, res) => {

  try{
    res.json(getMarketIndexHistory());

  } catch (err) {
    console.error("🔥 Error fetching market index history:", err);
    res.status(500).json({ error: "Internal server error" });
  }

});
router.get("/mood", getMarketMoodController);

module.exports = router;
