const getMarketMood = (stocks) => {
  let up = 0, down = 0;
  console.log("ESTOY AQUI")
  stocks.forEach(stock => {
    if (stock.change > 0) up++;
    else if (stock.change < 0) down++;
  });

  const total = up + down;
  const percentUp = total === 0 ? 0 : up / total;

  if (percentUp > 0.7) return "bullish";
  if (percentUp > 0.55) return "slightly bullish";
  if (percentUp < 0.3) return "bearish";
  if (percentUp < 0.45) return "slightly bearish";
  return "neutral";
};

module.exports = getMarketMood;
