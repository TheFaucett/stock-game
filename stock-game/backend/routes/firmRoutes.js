const express = require("express");
const router = express.Router();
const Firm = require("../models/Firm");

// GET /api/firms — all firms summary
router.get("/", async (req, res) => {
  const firms = await Firm.find({}, "name strategy balance transactions");
  res.json({ firms });
});


router.get("/:name", async (req, res) => {
  const name = decodeURIComponent(req.params.name); // decode URL
  const firm = await Firm.findOne({ name }); // find by name
  if (!firm) return res.status(404).json({ error: "Firm not found" });
  res.json({ firm });
});

module.exports = router;