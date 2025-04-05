let moodHistory = [];

const moodToValue = {
  bearish: -2,
  "slightly bearish": -1,
  neutral: 0,
  "slightly bullish": 1,
  bullish: 2,
};

function calculateMood(stocks) {
  let up = 0, down = 0;
  for (const stock of stocks) {
    if (stock.change > 0) up++;
    else if (stock.change < 0) down++;
  }

  const total = up + down;
  const percentUp = total === 0 ? 0 : up / total;

  if (percentUp > 0.65) return "bullish";
  if (percentUp > 0.5) return "slightly bullish";
  if (percentUp < 0.35) return "bearish";
  if (percentUp < 0.5) return "slightly bearish";
  return "neutral";
}

function recordMarketMood(stocks) {
  const mood = calculateMood(stocks);

  moodHistory.push({
    mood,
    value: moodToValue[mood],
    timestamp: Date.now(),
  });

  if (moodHistory.length > 30) {
    moodHistory = moodHistory.slice(-30); // keep last 30
  }

  return mood;
}

function getMoodHistory() {
  return moodHistory;
}

module.exports = {
  recordMarketMood,
  getMoodHistory,
};
