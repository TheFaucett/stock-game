const DAILY_REWARD_AMOUNT = 500;

const allQuests = [
  {
    id: "dividendHoldings",
    text: "Own 3 dividend-paying stocks",
    check: (portfolio, stocks) =>
      Object.keys(portfolio.ownedShares || {})
        .filter(ticker => {
          const stock = stocks.find(s => s.ticker === ticker);
          return stock?.dividendYield > 0;
        }).length >= 3
  },
  {
    id: "bigTrade",
    text: "Make a trade over $1,000",
    check: (portfolio) =>
      (portfolio.transactions || []).some(t => t.price * t.shares > 1000)
  },
  {
    id: "buyAndSell",
    text: "Buy and sell the same stock",
    check: (portfolio) => {
      const buys = new Set();
      const sells = new Set();
      for (const t of portfolio.transactions || []) {
        if (t.type === "buy") buys.add(t.ticker);
        if (t.type === "sell") sells.add(t.ticker);
      }
      return [...buys].some(ticker => sells.has(ticker));
    }
  },
  {
    id: "hold5",
    text: "Hold 5 different stocks",
    check: (portfolio) =>
      Object.keys(portfolio.ownedShares || {}).length >= 5
  },
  {
    id: "dividendEarner",
    text: "Receive at least $25 in dividends",
    check: (portfolio) =>
      (portfolio.transactions || []).some(t =>
        t.type === "dividend" && t.amount >= 25
      )
  }
];

/**
 * Deterministically pick quests for the current tick.
 */
function getDailyQuests(tick) {
  const seed = Math.floor(tick);
  const shuffled = [...allQuests].sort((a, b) => {
    const aSeed = (seed + hashString(a.id)) % 1000;
    const bSeed = (seed + hashString(b.id)) % 1000;
    return aSeed - bSeed;
  });
  return shuffled.slice(0, 2);
}

/**
 * Evaluate which quests are completed.
 */
function evaluateQuests(tick, portfolio, stocks) {
  const quests = getDailyQuests(tick);
  return quests.map(q => ({
    ...q,
    completed: q.check(portfolio, stocks),
    reward: DAILY_REWARD_AMOUNT
  }));
}

/**
 * Check if the reward has already been claimed for this tick.
 */
function hasClaimedReward(tick) {
  return localStorage.getItem(getClaimKey(tick)) === "true";
}

/**
 * Claim the reward and persist that state locally.
 */
function claimReward(tick) {
  localStorage.setItem(getClaimKey(tick), "true");
}

/**
 * Calculate total reward based on completed quests.
 */
function getTotalReward(quests) {
  return quests
    .filter(q => q.completed)
    .reduce((sum, q) => sum + (q.reward || 0), 0);
}

/**
 * Internal: Create a unique localStorage key.
 */
function getClaimKey(tick) {
  return `daily-quest-claimed-${tick}`;
}

/**
 * Internal: Simple string hasher for deterministic sorting.
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

// 🧩 Exports
export {
  getDailyQuests,
  evaluateQuests,
  getTotalReward,
  hasClaimedReward,
  claimReward
};
