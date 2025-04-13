let moodHistory = [];

// Optional: If you still want to show a label, we can derive it from the score
function labelFromPercent(percentUp) {
  if (percentUp > 0.65) return "bullish";
  if (percentUp > 0.5) return "slightly bullish";
  if (percentUp < 0.35) return "bearish";
  if (percentUp < 0.5) return "slightly bearish";
  return "neutral";
}

// Calculate a numeric market sentiment from 0 to 1
function calculateMood(stocks) {
  let up = 0, down = 0;
  for (const stock of stocks) {
    if (stock.change > 0) up++;
    else if (stock.change < 0) down++;
  }

  const total = up + down;
  const percentUp = total === 0 ? 0.5 : up / total; // neutral fallback
  return parseFloat(percentUp.toFixed(3)); // optional: trim to 3 decimals
}

function recordMarketMood(stocks) {
  const numericMood = calculateMood(stocks);
  const label = labelFromPercent(numericMood); // optional

  moodHistory.push({
    mood: label,
    value: numericMood,         // 👈 Now the value is 0.0–1.0
    timestamp: Date.now(),
  });

  if (moodHistory.length > 30) {
    moodHistory = moodHistory.slice(-30);
  }

  return numericMood; // returns the numeric value
}

function getMoodHistory() {
  return moodHistory;
}

module.exports = {
  recordMarketMood,
  getMoodHistory,
};
