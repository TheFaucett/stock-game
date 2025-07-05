let indexHistory = [];
const { getCurrentTick } = require('./tickTracker.js');
function recordMarketIndexHistory(stocks) {
  const averagePrice = stocks.reduce((acc, stock) => acc + stock.price, 0) / stocks.length;
  const rounded = parseFloat(averagePrice.toFixed(2));
  
  indexHistory.push({
    price: rounded,
    timestamp: getCurrentTick(),
  });

  if (indexHistory.length > 1825) {
    indexHistory = indexHistory.slice(-1825); //last five years 
  }

  return rounded;
}

function getMarketIndexHistory() {
  return indexHistory;
}

module.exports = { recordMarketIndexHistory, getMarketIndexHistory };
