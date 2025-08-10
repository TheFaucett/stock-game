// utils/generateEarnings.js


function generateEarningsReport(stock, currentTick) {
  const history = stock.history || [];
  const windowSize = 20;
  const recent = history.slice(-windowSize);

  if (recent.length < 2) {
    // Not enough history, fallback to default
    return generateRandomEarnings(stock, currentTick);
  }

  const startPrice = recent[0];
  const endPrice = recent[recent.length - 1];
  const netChange = ((endPrice - startPrice) / startPrice) * 100;

  // 📊 Volatility = average % change between points
  let volatility = 0;
  for (let i = 1; i < recent.length; i++) {
    volatility += Math.abs((recent[i] - recent[i - 1]) / recent[i - 1]) * 100;
  }
  volatility = volatility / (recent.length - 1);

  // 🎯 Determine earnings surprise based on trend
  let surprise;
  if (netChange > 5) {
    surprise = +(2 + Math.random() * 4).toFixed(2); // Strong beat
  } else if (netChange < -5) {
    surprise = +(-4 + Math.random() * 2).toFixed(2); // Strong miss
  } else {
    surprise = +(-1 + Math.random() * 2).toFixed(2); // Close to expected
  }

  // 💹 Volatility-weighted capped reaction
  const volatilityFactor = Math.min(Math.max(volatility / 3, 0.5), 1.5); // smooth scaling
  const reactionPct = surprise * volatilityFactor;
  const maxImpact = 0.08; // 8% max price swing from earnings
  const cappedPct = Math.max(Math.min(reactionPct / 100, maxImpact), -maxImpact);
  const reaction = +(stock.price * cappedPct).toFixed(2);

  // 📈 Financials
  const baseRevenue = +(stock.price * 10 + (Math.random() * 50)).toFixed(1);
  const netIncome = +(baseRevenue * ((5 + surprise) / 100)).toFixed(1);
  const eps = +(netIncome / (10 + Math.random() * 10)).toFixed(2);

  // 🕒 Next earnings date
  const nextTick = currentTick + 50 + Math.floor(Math.random() * 50);

  // 💵 We do NOT overwrite the whole price — let updateMarket blend this in
  const newPrice = Math.max(0.01, +(stock.price + reaction).toFixed(2));

  return {
    report: {
      revenue: baseRevenue,
      netIncome,
      eps,
      surprise,
      marketReaction: reaction, // absolute $ move
      marketReactionPct: cappedPct, // useful if blending later
      tickReported: currentTick,
      netChange: netChange.toFixed(2),
      volatility: volatility.toFixed(2),
      nextEarningsTick: nextTick
    },
    newPrice,
    nextEarningsTick: nextTick,
    momentum: cappedPct // can be applied additively over a few ticks in updateMarket
  };
}

function generateRandomEarnings(stock, currentTick) {
  const revenue = +(100 + Math.random() * 500).toFixed(1);
  const netIncome = +(revenue * (0.1 + Math.random() * 0.2)).toFixed(1);
  const eps = +(netIncome / (10 + Math.random() * 10)).toFixed(2);
  const surprise = +(Math.random() * 10 - 5).toFixed(2);

  // cap surprise effect here too
  const volatilityFactor = 1;
  const reactionPct = surprise * volatilityFactor;
  const maxImpact = 0.08;
  const cappedPct = Math.max(Math.min(reactionPct / 100, maxImpact), -maxImpact);
  const reaction = +(stock.price * cappedPct).toFixed(2);

  const newPrice = Math.max(0.01, +(stock.price + reaction).toFixed(2));
  const nextTick = currentTick + 50 + Math.floor(Math.random() * 50);

  return {
    report: {
      revenue,
      netIncome,
      eps,
      surprise,
      marketReaction: reaction,
      marketReactionPct: cappedPct,
      nextEarningsTick: nextTick,
      tickReported: currentTick
    },
    newPrice,
    nextEarningsTick,
    momentum: cappedPct
  };
}



module.exports = generateEarningsReport;
