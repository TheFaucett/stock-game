// routes/marketRoutes.js
const express = require("express");
const router = express.Router();
const { getMarketMoodController } = require("../controllers/marketController");

router.get("/mood", getMarketMoodController);

module.exports = router;
