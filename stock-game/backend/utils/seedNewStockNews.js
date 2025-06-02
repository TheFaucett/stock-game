// backend/utils/seedStockNews.js
require('dotenv').config();
const mongoose  = require('mongoose');
const StockNews = require('../models/StockNews');
const rawNews   = require('../newNews.json'); // your JSON with { "sectors": { … } }

async function seedStockNews() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is not set in your .env file.');
    process.exit(1);
  }

  // 1) Connect to MongoDB
  await mongoose.connect(uri, {
    useNewUrlParser:    true,
    useUnifiedTopology: true
  });

  // 2) Validate that rawNews.sectors exists and is an object
  if (
    !rawNews ||
    typeof rawNews !== 'object' ||
    rawNews.sectors == null ||
    typeof rawNews.sectors !== 'object'
  ) {
    console.error('❌ The JSON file does not have a top‐level "sectors" object.');
    console.error('   Make sure newNews.json looks like:');
    console.error('   { "sectors": { "communication_services": [ … ], "health_care": [ … ], … } }');
    await mongoose.disconnect();
    process.exit(1);
  }

  // 3) Upsert: store the entire "sectors" object in a single StockNews doc
  try {
    const result = await StockNews.findOneAndUpdate(
      {},                    // filter: “any document” (we only want one)
      {
        $set: { sectors: rawNews.sectors }
      },
      {
        upsert: true,        // if none exists, create it
        new: true,           // return the updated/inserted doc (not strictly needed)
      }
    );
    console.log('✅ StockNews has been upserted. Current document:');
    console.log(JSON.stringify(result.toObject(), null, 2));
  } catch (err) {
    console.error('❌ Error during StockNews upsert:', err);
  }

  // 4) Disconnect and exit
  await mongoose.disconnect();
  process.exit(0);
}

seedStockNews().catch(err => {
  console.error('❌ Unexpected error in seedStockNews():', err);
  process.exit(1);
});
