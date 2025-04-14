// utils/marketCrash.js


/*






----------------------------------
    UNDERSTAND THIS FUNCTION IS NOT CURRENTLY VALID OR TO BE USED
----------------------------------






















const mongoose = require('mongoose');
const GlobalNews = require('../models/GlobalNews'); // Update path if needed

// 🚨 Directly defined market crash payload
const crashNewsItem = {
  description: "🚨 The International Monetary Fund declares a sudden and severe global recession, citing catastrophic economic indicators and collapsing consumer confidence.",
  sentimentScore: -10000000000000,
  type: "global",
  date: new Date()
};

async function injectMarketCrash() {
  try {
    await mongoose.connect('mongodb://localhost:27017/your-db-name', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const result = await GlobalNews.create(crashNewsItem);
    console.log("✅ Injected market crash news:", result.description);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to inject market crash:", err);
    process.exit(1);
  }
}

injectMarketCrash();
*/