const Stock = require('../models/Stock');


const N = 4; // number of stocks you want to return
async function getTopMovers() {
    const topMovers = await Stock.aggregate([
    // 1️⃣ Add a computed field for abs(change)
    {
        $addFields: {
        absChange: { $abs: "$change" }
        }
    },
    // 2️⃣ Sort by absChange descending (biggest movers first)
    { $sort: { absChange: -1 } },
    
    // 3️⃣ Limit to N results
    { $limit: N },

    // 4️⃣ Project only the fields you want to send to frontend
    {
        $project: {
        _id: 0,                // don't include Mongo _id
        ticker: 1,
        price: 1,
        change: 1,
        sector: 1,
        marketCap: { $multiply: [ "$price", "$outstandingShares" ] }
        }
    }
    ]);
    return topMovers;
}

async function getMostVolatileStocks(N = 4) {
  try {
    const volatileStocks = await Stock.aggregate([
      // Sort by volatility descending
      { $sort: { volatility: -1 } },
      // Limit to N
      { $limit: N },
      // Project only needed fields
      {
        $project: {
          _id: 0,
          ticker: 1,
          price: 1,
          change: 1,
          sector: 1,
          volatility: 1,
          outstandingShares: 1,
          marketCap: { $multiply: ["$price", "$outstandingShares"] }
        }
      }
    ]);

    return volatileStocks;
  } catch (err) {
    console.error("Error in getMostVolatileStocks:", err);
    throw err;
  }
}
async function getTopMarketCapStocks(N = 4) {
  try {
    const topStocks = await Stock.aggregate([
      // Compute marketCap for each stock
      {
        $addFields: {
          marketCap: { $multiply: ["$price", "$outstandingShares"] }
        }
      },
      // Sort by marketCap descending
      { $sort: { marketCap: -1 } },
      // Limit to N
      { $limit: N },
      // Project only needed fields
      {
        $project: {
          _id: 0,
          ticker: 1,
          price: 1,
          change: 1,
          sector: 1,
          marketCap: 1,
          volatility: 1
        }
      }
    ]);

    return topStocks;
  } catch (err) {
    console.error("Error in getTopMarketCapStocks:", err);
    throw err;
  }
}
const getTopDividendYieldStocks = async (N = 4) => {
  return await Stock.aggregate([
    { $match: { dividendYield: { $gt: 0 } } }, // skip stocks with no yield
    { $sort: { dividendYield: -1 } },          // DESCENDING: highest yield first
    { $limit: N },
    { $project: {
      _id: 0,
      ticker: 1,
      price: 1,
      dividendYield: 1,
      sector: 1,
      volatility: 1,
      outstandingShares: 1,
      marketCap: { $multiply: ["$price", "$outstandingShares"] }
    }}
  ]);
};
module.exports = {
    getTopMovers,
    getMostVolatileStocks,
    getTopMarketCapStocks,
    getTopDividendYieldStocks

}