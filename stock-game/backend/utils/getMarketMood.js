let moodHistory = [];
const { getCurrentTick } = require('./tickTracker.js');
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
  if (!stocks || stocks.length === 0) return 0.5;

  // 1. Compute average % change
  const changes = stocks.map(s => s.change ?? 0);
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

  // 2. Use tanh to emphasize emotional swings (±1% avg → ~0.24 to ~0.76 mood)
  const moodRaw = Math.tanh(avgChange / 2); // Scale factor controls sensitivity
  const numericMood = 0.5 + moodRaw * 0.5;   // Maps -1..1 → 0..1

  // 3. Optional label (bullish/bearish/neutral)
  let label = "neutral";
  if (numericMood > 0.66) label = "bullish";
  else if (numericMood < 0.33) label = "bearish";

  // 4. Store history with label + numeric value
  moodHistory.push({
    mood: label,
    value: +numericMood.toFixed(4),
    timestamp: getCurrentTick(),
  });

  // 5. Limit history length
  if (moodHistory.length > 30) {
    moodHistory = moodHistory.slice(-30);
  }

  return numericMood;
}

function getMoodHistory() {
  return moodHistory;
}

module.exports = {
  recordMarketMood,
  getMoodHistory,
};
