const Stock = require("../models/Stock");
const Firm = require("../models/Firm");
const { getCurrentTick } = require("../utils/tickTracker.js");
const { getEconomicFactors } = require("../utils/economicEnvironment.js");

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const DEBUG = false // set to true for detailed logs
function getNetWorth(firm, stockMap) {
  const equity = Object.entries(firm.ownedShares || {}).reduce((sum, [ticker, shares]) => {
    const price = stockMap[ticker]?.price ?? 0;
    return sum + (price * shares);
  }, 0);
  return firm.balance + equity;
}

function getTradeShares(firm, price) {
  const reserve = firm.balance * 0.25;
  const budget = firm.balance - reserve;
  const max = Math.floor(budget / price);
  const lossRatio = firm.startingBalance ? Math.min(1, 1 - (firm.balance / firm.startingBalance)) : 0;
  const adjustedRisk = 0.25 * (1 - lossRatio); // less risk as balance drops
  const capped = Math.min(max, Math.floor((adjustedRisk * firm.balance) / price));
  return capped > 0 ? Math.max(1, Math.floor(capped * (0.2 + Math.random() * 0.4))) : 0;
}

function getSellPortion(currentShares) {
  return Math.max(1, Math.floor(currentShares * 0.5)); // consistent partial liquidation
}

function updateRiskTolerance(firm, outcome) {
  if (typeof firm.riskTolerance !== "number") firm.riskTolerance = 0.15 + Math.random() * 0.2;
  if (outcome === "win") firm.riskTolerance = Math.min(0.8, firm.riskTolerance + 0.03);
  else if (outcome === "loss") firm.riskTolerance = Math.max(0.05, firm.riskTolerance - 0.05);
}

function updateMemory(firm, stock, action, price, econ, outcome) {
  const tick = getCurrentTick();
  const ticker = stock.ticker;

  firm.memory ||= {};
  firm.emotions ||= { confidence: 0.5, frustration: 0.2, greed: 0.5, regret: 0.2 };
  firm.emotions = { ...firm.emotions };

  if (!firm.memory[ticker] || typeof firm.memory[ticker] !== 'object') {
    firm.memory[ticker] = {
      recentPrices: [],
      boughtAtTick: null,
      holdUntilTick: null,
      lastOutcome: 'neutral'
    };
  } else {
    firm.memory[ticker] = { ...firm.memory[ticker] };
  }

  const mem = firm.memory[ticker];
  mem.recentPrices.push(price);
  console.log('FLAG: ', mem.recentPrices)
  if (mem.recentPrices.length > 10) mem.recentPrices.shift();

  if (action === "buy") {
    mem.boughtAtTick = tick;
    mem.holdUntilTick = tick + 5 + Math.floor(Math.random() * 5);
  }

  mem.lastOutcome = outcome;

  // Emotion adjustments
  const e = firm.emotions;
  if (outcome === "win") {
  e.confidence += 0.03;
  e.greed += 0.01;
  e.frustration = Math.max(0, e.frustration - 0.05);
  e.regret = Math.max(0, e.regret - 0.04);
  } else if (outcome === "loss") {
  // Crippling fear response 💀
  e.confidence = Math.max(0, e.confidence - 0.15);
  e.greed = Math.max(0, e.greed - 0.1);
  e.frustration = Math.min(1, e.frustration + 0.2);
  e.regret = Math.min(1, e.regret + 0.25);

  firm.cooldownUntil = tick + 5 + Math.floor(Math.random() * 5);
  }


  if (econ.macroEvent === "recession") {
    e.confidence -= 0.04;
    e.greed -= 0.02;
  } else if (econ.macroEvent === "boom") {
    e.confidence += 0.03;
    e.greed += 0.03;
  }

  // Clamp emotions
  for (let key of ["confidence", "frustration", "greed", "regret"]) {
    e[key] = Math.min(1, Math.max(0, e[key] ?? 0.5));
  }

  updateRiskTolerance(firm, outcome);
  firm.memory[ticker] = mem;
  firm.emotions = e;
  firm.markModified("memory");
  firm.markModified("emotions");
}

function shouldBuy(firm, stock, netWorth, currentHoldValue) {
  const mem = firm.memory?.[stock.ticker];
  if (!mem) return true;

  const tick = getCurrentTick();
  if ((tick - (mem.lastActionTick || 0)) < 5) return false;
  if (firm.emotions?.confidence < 0.35 || firm.balance < stock.price * 2) return false;
  if (firm.balance < firm.startingBalance * 0.2) return false;
  if (currentHoldValue / netWorth > 0.25) return false;

  const recent = mem.recentPrices.slice(-3);
  if (recent.length === 3 && !(recent[2] > recent[1] && recent[1] > recent[0])) return false;

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  return stock.price < avgRecent * 0.99;
}

function shouldSell(firm, stock, tick) {
  const mem = firm.memory?.[stock.ticker];
  if (!mem) return false;

  const holding = tick - (mem.boughtAtTick ?? tick);
  const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
  const gain = (stock.price - avgBuy) / avgBuy;

  const sharesHeld = firm.ownedShares?.[stock.ticker] || 0;
  const portfolioSize = Object.values(firm.ownedShares || {}).reduce((sum, val) => sum + val, 0);
  const weight = portfolioSize > 0 ? sharesHeld / portfolioSize : 0;

  const MAX_HOLD_TICKS = 12;
  const MIN_GAIN_SELL = 0.015;
  const LOSS_CUTOFF = -0.03;
  const MIN_BALANCE = 5000;

  if (gain > MIN_GAIN_SELL || (gain > 0 && Math.random() < 0.3)) return true;
  if (gain < LOSS_CUTOFF || firm.balance < MIN_BALANCE) return true;
  if (gain < -0.10) return true; // force sell

  if (holding > MAX_HOLD_TICKS) return true;

  const overweightSellChance = Math.min(0.05 + weight * 2.5, 0.9);
  if (weight > 0.3 && gain > 0.01) return true;
  if (Math.random() < overweightSellChance) return true;

  if (holding > 4 && Math.abs(gain) < 0.01 && Math.random() < 0.2) return true;

  return false;
}

async function executeTrade(firm, stock, action, econ, tick) {
  const owned = firm.ownedShares?.[stock.ticker] ?? 0;
  let outcome = 'neutral';

  if (action === 'buy') {
    const shares = getTradeShares(firm, stock.price);
    if (shares <= 0) return null;
    firm.balance -= shares * stock.price;
    firm.ownedShares[stock.ticker] = owned + shares;
    firm.transactions.push({
      type: 'buy', ticker: stock.ticker, shares, price: stock.price,
      total: shares * stock.price, date: new Date()
    });
  } else {
    const sellShares = getSellPortion(owned);
    if (sellShares <= 0) return null;
    const proceeds = sellShares * stock.price;
    firm.balance += proceeds;
    const remaining = owned - sellShares;
    if (remaining > 0) firm.ownedShares[stock.ticker] = remaining;
    else delete firm.ownedShares[stock.ticker];
    firm.transactions.push({
      type: 'sell', ticker: stock.ticker, shares: sellShares, price: stock.price,
      total: proceeds, date: new Date()
    });

    const avgBuy = (firm.memory?.[stock.ticker]?.recentPrices || []).reduce((a, b) => a + b, 0) /
      Math.max(1, firm.memory?.[stock.ticker]?.recentPrices?.length || 1);
    const pl = stock.price - avgBuy;
    outcome = pl > 0 ? "win" : (pl < 0 ? "loss" : "neutral");
  }

  updateMemory(firm, stock, action, stock.price, econ, outcome);
  firm.markModified("memory");
  firm.markModified("emotions");
  firm.markModified("ownedShares");
  return true;
}

const processFirms = async (marketMood) => {
  const firms = await Firm.find();
  const econ = getEconomicFactors();
  const tick = getCurrentTick();
  const stocks = await Stock.find();
  const stockMap = Object.fromEntries(stocks.map(s => [s.ticker, s]));

  for (const firm of firms) {
    if (!firm.startingBalance) firm.startingBalance = firm.balance;

    // 🧠 Seed memory for all owned stocks
    for (const [ticker, shares] of Object.entries(firm.ownedShares || {})) {
      if (!firm.memory) firm.memory = {};
      if (!firm.memory[ticker]) {
        firm.memory[ticker] = {
          recentPrices: [],
          boughtAtTick: null,
          holdUntilTick: null,
          lastOutcome: 'neutral'
        };
      }
      const mem = firm.memory[ticker];
      mem.recentPrices ||= [];

      const currentPrice = stockMap[ticker]?.price;
      if (currentPrice) {
        mem.recentPrices.push(currentPrice);
        if (mem.recentPrices.length > 10) mem.recentPrices.shift();
      }
    }

    firm.markModified("memory");

    const netWorth = getNetWorth(firm, stockMap);

    if (DEBUG) {
      console.log(`\n🧠 [Tick ${tick}] ${firm.name}`);
      console.log(`   💵 Balance: $${firm.balance.toFixed(2)} | Net Worth: $${netWorth.toFixed(2)}`);
      console.log(`   😐 Emotions:`, firm.emotions);
    }

    if ((firm.cooldownUntil && tick < firm.cooldownUntil) ||
        (tick - (firm.lastTradeCycle || 0)) < (firm.tradingFrequency || 1)) {
      if (DEBUG) console.log("   ⏳ Skipping firm due to cooldown or frequency");
      continue;
    }

    let trades = 0;

    // Try BUY
    const stockList = stocks.slice(0, 50);
    const toBuy = randomElement(stockList);
    const currentHoldVal = (toBuy.price || 0) * (firm.ownedShares?.[toBuy.ticker] || 0);

    if (DEBUG) {
      console.log(`   📈 Evaluating BUY: ${toBuy.ticker} @ $${toBuy.price}`);
    }

    if (toBuy && shouldBuy(firm, toBuy, netWorth, currentHoldVal)) {
      if (DEBUG) console.log(`   ✅ Buying ${toBuy.ticker}`);
      const did = await executeTrade(firm, toBuy, "buy", econ, tick);
      if (did) {
        trades++;
      }
    } else {
      if (DEBUG) console.log(`   ❌ Skipped BUY (conditions not met)`);
    }

    // Try SELL
    for (const ticker of Object.keys(firm.ownedShares || {})) {
      if (trades >= 2) break;
      const s = stockMap[ticker];
      if (!s) continue;

      const mem = firm.memory?.[ticker];
      const avgBuy = mem?.recentPrices?.length > 0
        ? mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length
        : 0;

      const gain = avgBuy ? ((s.price - avgBuy) / avgBuy) : 0;

      if (DEBUG) {
        console.log(`   📉 Evaluating SELL: ${ticker} @ $${s.price.toFixed(2)} | Avg Buy: $${avgBuy.toFixed(2)} | Gain: ${(gain * 100).toFixed(2)}%`);
      }

      // 🚫 Skip same-tick sells to prevent instant churn
      if ((tick - (mem?.boughtAtTick ?? 0)) < 1) {
        if (DEBUG) console.log(`   ⏳ Skipping SELL (just bought this tick)`);
        continue;
      }

      if (shouldSell(firm, s, tick)) {
        if (DEBUG) console.log(`   ✅ Selling ${ticker}`);
        const did = await executeTrade(firm, s, "sell", econ, tick);
        if (did) trades++;
      } else {
        if (DEBUG) console.log(`   ❌ Skipped SELL (conditions not met)`);
      }
    }

    if (trades > 0) {
      firm.lastTradeCycle = tick;
      await firm.save();
      if (DEBUG) console.log(`   💾 Saved trades for ${firm.name}`);
    } else if (DEBUG) {
      console.log(`   💤 No trades made`);
    }
  }

  return [];
};



module.exports = { processFirms };
