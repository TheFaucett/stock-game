let moodHistory = [];
const { getCurrentTick } = require('./tickTracker.js');

// Optional: Mood label
function labelFromScore(score) {
  if (score > 0.66) return "bullish";
  if (score > 0.55) return "slightly bullish";
  if (score < 0.33) return "bearish";
  if (score < 0.45) return "slightly bearish";
  return "neutral";
}

function recordMarketMood(stocks) {


  if (!stocks || !stocks.length) return 0.5;

  // 1. Compute average % change
  const changes = stocks.map(s => s.change ?? 0);
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

  // 2. Amplify mood signal
  const SENSITIVITY = 3.5; // ✅ Tune this
  const moodRaw = Math.tanh(avgChange * SENSITIVITY); // ~-1 to +1
  const moodScore = 0.5 + moodRaw * 0.5;               // map to 0..1
  const cycle = Math.sin(getCurrentTick()/500) *0.5 // to prevent stuck mood 
  // 3. Apply slight momentum (mood inertia)
  const previous = moodHistory.at(-1)?.value ?? 0.5;
  const blended = 0.75 * moodScore + 0.25 * previous;

  // 4. Label
  const moodLabel = labelFromScore(blended);

  moodHistory.push({
    mood: moodLabel,
    value: +blended.toFixed(4),
    timestamp: getCurrentTick()
  });

  if (moodHistory.length > 30) {
    moodHistory = moodHistory.slice(-30);
  }

  console.log(`📈 Market mood: ${moodLabel} (${blended.toFixed(4)}) from avg Δ${avgChange.toFixed(2)}%`);

  return blended;
}

function getMoodHistory() {
  return moodHistory;
}

module.exports = {
  recordMarketMood,
  getMoodHistory,
};
