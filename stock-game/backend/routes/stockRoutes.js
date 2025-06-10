const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock'); // Ensure correct model import

// GET all stocks with rounded values
router.get('/', async (req, res) => {
    try {
        let stocks = await Stock.find();

        // Round numeric values before sending response
        stocks = stocks.map(stock => ({
            ...stock.toObject(),
            price: parseFloat(stock.price.toFixed(2)),
            change: parseFloat(stock.change.toFixed(2)),
            peRatio: parseFloat(stock.peRatio.toFixed(2)),
            dividendYield: parseFloat(stock.dividendYield.toFixed(4)), // Keeping 4 decimal places for yield
            history: stock.history.map(value => parseFloat(value.toFixed(2))) // Ensuring history values are rounded too
        }));

        res.json(stocks);
    } catch (error) {
        console.error('Error fetching stocks:', error);
        res.status(500).json({ error: 'Error fetching stocks' });
    }
});



async function getSectorDataForHeatmap() {
  try {
    const pipeline = [
      // 1) compute marketCap on each document
      {
        $project: {
          ticker: 1,
          sector: 1,
          price: 1,
          change: 1,
          outstandingShares: 1,
          marketCap: { $multiply: ["$price", "$outstandingShares"] }
        }
      },
      // 2) sort descending by marketCap
      { $sort: { marketCap: -1 } },
      // 3) take only the top 150
      { $limit: 150 },
      // 4) group the remaining 150 by sector
      {
        $group: {
          _id: "$sector",
          totalMarketCap: { $sum: "$marketCap" },
          stocks: {
            $push: {
              ticker:    "$ticker",
              price:     "$price",
              change:    "$change",
              marketCap: "$marketCap"
            }
          }
        }
      },
      // 5) sort sectors by their total marketCap (so the biggest‐sectors come first)
      { $sort: { totalMarketCap: -1 } }
    ]

    const sectors = await Stock.aggregate(pipeline)

    // Finally, re‐shape into exactly what the frontend’s Treemap expects:
    return sectors.map((sector) => ({
      name: sector._id,
      value: sector.totalMarketCap,
      children: sector.stocks.map((s) => ({
        name:   s.ticker,
        value:  s.marketCap,
        change: s.change
      }))
    }))
  } catch (error) {
    console.error("Error fetching heatmap data:", error)
    return []
  }
}




router.get("/heatmap", async (req, res) => {
    try {
        const heatmapData = await getSectorDataForHeatmap();
        res.json({ success: true, heatmapData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching heatmap" });
    }
});
router.get('/sector-heatmap', async (req, res) => {
    try {
        const sectorData = await Stock.aggregate([
            {
                $group: {
                    _id: "$sector",
                    totalMarketCap: { $sum: { $multiply: ["$price", "$outstandingShares"] } },
                    avgChange: { $avg: "$change" }, // Average price change percentage
                    count: { $sum: 1 } // Number of stocks in the sector
                }
            },
            { $sort: { totalMarketCap: -1 } } // Sort by market cap (largest first)
        ]);

        res.json({ success: true, sectors: sectorData });
    } catch (error) {
        console.error("❌ Error fetching sector heatmap data:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

//For StockDetail
router.get("/:ticker", async (req, res) => {
    try {
        const stock = await Stock.findOne({ ticker: req.params.ticker.toUpperCase() });
        if (!stock) {
            return res.status(404).json({ error: "Stock not found" });
        }
        res.json(stock);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
//also for stockdetail (graph)
router.get('/:ticker/history', async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase(); // Ensures ticker is uppercase
        const stock = await Stock.findOne({ ticker });

        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        res.json({
            ticker: stock.ticker,
            history: stock.history
        });
    } catch (err) {
        console.error('Error fetching stock history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;
