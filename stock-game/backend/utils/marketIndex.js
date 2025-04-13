let indexHistory = [];

function recordMarketIndexHistory(stocks) {
  const averagePrice = stocks.reduce((acc, stock) => acc + stock.price, 0) / stocks.length;
  const rounded = parseFloat(averagePrice.toFixed(2));
  
  indexHistory.push({
    price: rounded,
    timestamp: Date.now(),
  });

  if (indexHistory.length > 30) {
    indexHistory = indexHistory.slice(-30);
  }

  return rounded;
}

function getMarketIndexHistory() {
  return indexHistory;
}

module.exports = { recordMarketIndexHistory, getMarketIndexHistory };
