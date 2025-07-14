const express = require("express");
const router = express.Router();
const Firm = require("../models/Firm");

// GET /api/firms — all firms summary
router.get("/", async (req, res) => {
  try {
    const firms = await Firm.find({}, "name strategy balance transactions");
    res.json({ firms });

  } catch (error) {
    console.error("🔥 Error fetching firms:", error);
    res.status(500).json({ error: "Internal server error" });
  }

});


router.get("/:name", async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name).trim();
        const firm = await Firm.findOne({
        name: { $regex: `^${name}$`, $options: "i" }
    });

    if (!firm) return res.status(404).json({ error: "Firm not found" });
    res.json({ firm });


  } catch (error) {
      console.error("🔥 Error fetching firm:", error);
      res.status(500).json({ error: "Internal server error" });
  }

});

module.exports = router;