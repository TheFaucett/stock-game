// utils/megaCaps.js
let megaCaps = [];
let selectionTick = null;

async function selectMegaCaps(stocks, tick) {
  const withCap = stocks.map(s => ({
    ticker: s.ticker,
    marketCap: (s.price || 0) * (s.outstandingShares || 1),
    avgChange: s.history?.length > 0
      ? s.history.slice(-200).reduce((a, b) => a + b, 0) / s.history.slice(-200).length
      : 0,
    vol: s.volatility || 0
  }));

  // Median volatility
  const medianVol = [...withCap].sort((a, b) => a.vol - b.vol)[Math.floor(withCap.length / 2)].vol;

  megaCaps = withCap
    .filter(s => s.avgChange > 0 && s.vol <= medianVol)
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 5)
    .map(c => c.ticker);

  selectionTick = tick;
  return megaCaps;
}

function getMegaCaps() {
  return { megaCaps, selectionTick };
}

module.exports = { selectMegaCaps, getMegaCaps };
