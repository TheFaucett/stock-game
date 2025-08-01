// controllers/newsImpactController.js
const Stock = require("../models/Stock");
const { getLatestNewsData } = require("../controllers/newsController");

// Helper: determine weight from sentiment
function getNewsWeight(newsItem) {
  const score = newsItem.sentimentScore ?? 0; 
  const minWeight = 25; 
  const maxWeight = 100;
  const absScore = Math.abs(score);
  const weight = minWeight + ((maxWeight - minWeight) * (absScore / 10));
  return weight + Math.random() * 3.5;
}

async function applyImpactToStocks() {
  try {
    const rawNews = await getLatestNewsData();

    if (!rawNews || Object.keys(rawNews).length === 0) {
      console.log("ℹ️ No news impact to apply.");
      return;
    }

    // 1️⃣ Flatten news into a single array
    const newsData = [];
    for (const [sector, items] of Object.entries(rawNews)) {
      for (const item of items) {
        newsData.push({
          sector: sector !== "global" ? sector : null,
          ticker: item.ticker ?? null,
          description: item.description,
          sentimentScore: item.sentimentScore
        });
      }
    }
    console.log(`🗞️ Flattened ${newsData.length} news items for processing`);

    // Map of ticker -> { stock, totalImpact, logs }
    const impactMap = new Map();

    // 2️⃣ Process each news item
    for (const newsItem of newsData) {
      const weight = getNewsWeight(newsItem);

      // Build query based on specificity
      let query;
      if (newsItem.ticker) {
        query = { ticker: newsItem.ticker };
      } else if (newsItem.sector) {
        query = { sector: newsItem.sector };
      } else {
        console.warn(`⚠️ Global news applied to all stocks: "${newsItem.description}"`);
        query = {}; // All stocks
      }

      const affectedStocks = await Stock.find(query);
      console.log(
        `📰 Processing news for ${newsItem.ticker || newsItem.sector || "MARKET"} | Sentiment: ${newsItem.sentimentScore}, Weight: ${weight.toFixed(1)} | Matches: ${affectedStocks.length}`
      );

      for (const stock of affectedStocks) {
        const normalizedSentiment = Math.max(-1, Math.min(1, newsItem.sentimentScore / 10));
        const normalizedWeight    = Math.max(0, Math.min(1, weight / 100));

        // ±0.5% random market sentiment noise
        let marketSentiment = (Math.random() - 0.5) * 0.01 * stock.price;

        // Max 5% per news
        let maxNewsImpact = stock.price * 0.05;
        let newsImpact = normalizedSentiment * normalizedWeight * maxNewsImpact;

        // Cap total per tick
        let maxTotalDelta = stock.price * 0.05;
        let totalImpact = Math.max(Math.min(newsImpact + marketSentiment, maxTotalDelta), -maxTotalDelta);

        // Stacking — soften negatives more than positives
        if (impactMap.has(stock.ticker)) {
          const prev = impactMap.get(stock.ticker);
          if (totalImpact < 0) {
            totalImpact = prev.totalImpact + totalImpact * 0.25;
          } else {
            totalImpact = prev.totalImpact + totalImpact * 0.5;
          }
          impactMap.set(stock.ticker, {
            ...prev,
            totalImpact,
            logs: [
              ...prev.logs,
              `[stacked news] Sentiment: ${newsItem.sentimentScore}, Weight: ${weight.toFixed(1)}, Δ: ${totalImpact.toFixed(2)}`
            ]
          });
        } else {
          impactMap.set(stock.ticker, {
            stock,
            totalImpact,
            logs: [
              `Sector: ${newsItem.sector || "N/A"}, Sentiment: ${newsItem.sentimentScore}, Weight: ${weight.toFixed(1)}, Δ: ${totalImpact.toFixed(2)}`
            ]
          });
        }
      }
    }

    // 3️⃣ Market-wide summary
    let netImpactSum = 0, upCount = 0, downCount = 0, totalUpImpact = 0, totalDownImpact = 0;
    for (const { totalImpact } of impactMap.values()) {
      netImpactSum += totalImpact;
      if (totalImpact > 0) {
        upCount++;
        totalUpImpact += totalImpact;
      } else if (totalImpact < 0) {
        downCount++;
        totalDownImpact += totalImpact;
      }
    }
    const avgUpImpact = upCount ? totalUpImpact / upCount : 0;
    const avgDownImpact = downCount ? totalDownImpact / downCount : 0;
    console.log(`📊 News summary: NetImpact=${netImpactSum.toFixed(2)} | Up=${upCount} avg ${avgUpImpact.toFixed(2)} | Down=${downCount} avg ${avgDownImpact.toFixed(2)}`);

    // 4️⃣ Apply to DB
    const ops = [];
    for (const { stock, totalImpact, logs } of impactMap.values()) {
      let newPrice = parseFloat((stock.price + totalImpact).toFixed(2));
      newPrice = Math.max(0.01, newPrice);

      const newHist = [...(stock.history || []), newPrice];
      while (newHist.length > 30) newHist.shift();

      const previousPrice = newHist.length > 1 ? newHist[newHist.length - 2] : newPrice;
      const change = previousPrice === 0
        ? 0
        : parseFloat(((newPrice - previousPrice) / previousPrice * 100).toFixed(2));

      console.log(`   🧐 ${stock.ticker} | ${logs.join(" | ")}`);
      console.log(`      📌 Old: ${previousPrice} → 💰 New: ${newPrice} (${change >= 0 ? "+" : ""}${change}%)`);

      ops.push({
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: {
              price: newPrice,
              change,
              history: newHist
            }
          }
        }
      });
    }

    if (ops.length) {
      await Stock.bulkWrite(ops);
      console.log(`✅ Bulk-updated ${ops.length} stocks with news impact`);
    } else {
      console.log("ℹ️ No impacted stocks to update.");
    }

  } catch (error) {
    console.error("⚠️ Error updating stock prices:", error);
  }
}

module.exports = { applyImpactToStocks };
