const Stock = require("../models/Stock");
const Firm = require("../models/Firm");
const { getCurrentTick } = require("../utils/tickTracker.js");
const { getEconomicFactors } = require("../utils/economicEnvironment.js");

// Mood multipliers
function getMoodBias(mood) {
    return {
        buyBias: 0.4 + mood,
        sellBias: 0.6 - mood,
    };
}

// 1. Make Sell More Frequent and Diverse
// Utility to pick a random portion to sell
function getSellPortion(currentShares) {
    return Math.max(1, Math.floor(currentShares * (0.3 + Math.random() * 0.7)));
}

function updateRiskTolerance(firm, outcome) {
    if (typeof firm.riskTolerance !== "number") firm.riskTolerance = 0.15 + Math.random() * 0.25;
    if (outcome === "win") {
        firm.riskTolerance = Math.min(0.8, firm.riskTolerance + 0.05);
    } else if (outcome === "loss") {
        firm.riskTolerance = Math.max(0.05, firm.riskTolerance - 0.05);
    }
}

// Track memory for smarter decisions
function updateMemoryAndEmotions(firm, stock, action, tradePrice, econ, outcome) {
    if (!firm.memory) firm.memory = {};
    const ticker = stock.ticker;
    const m = firm.memory[ticker] || { recentPrices: [], lastOutcome: 'neutral', boughtAtTick: null };
    m.recentPrices.push(tradePrice);
    if (m.recentPrices.length > 10) m.recentPrices.shift();
    if (action === "buy") m.boughtAtTick = getCurrentTick();
    m.lastOutcome = outcome;
    firm.memory[ticker] = m;

    if (!firm.emotions) firm.emotions = { confidence: 0.5, frustration: 0, greed: 0.5, regret: 0 };

    if (outcome === 'win') {
        firm.emotions.confidence = Math.min(1, firm.emotions.confidence + 0.05);
        firm.emotions.frustration = Math.max(0, firm.emotions.frustration - 0.05);
        firm.emotions.greed = Math.min(1, firm.emotions.greed + 0.03);
        firm.emotions.regret = Math.max(0, firm.emotions.regret - 0.03);
    } else if (outcome === 'loss') {
        firm.emotions.confidence = Math.max(0, firm.emotions.confidence - 0.07);
        firm.emotions.frustration = Math.min(1, firm.emotions.frustration + 0.07);
        firm.emotions.greed = Math.max(0, firm.emotions.greed - 0.03);
        firm.emotions.regret = Math.min(1, firm.emotions.regret + 0.05);
    } else {
        firm.emotions.confidence += (0.5 - firm.emotions.confidence) * 0.05;
        firm.emotions.frustration += (0 - firm.emotions.frustration) * 0.03;
        firm.emotions.greed += (0.5 - firm.emotions.greed) * 0.03;
        firm.emotions.regret += (0 - firm.emotions.regret) * 0.03;
    }

    if (econ.macroEvent === "recession") {
        firm.emotions.confidence = Math.max(0, firm.emotions.confidence - 0.03);
        firm.emotions.regret = Math.min(1, firm.emotions.regret + 0.04);
    }
    if (econ.macroEvent === "boom") {
        firm.emotions.confidence = Math.min(1, firm.emotions.confidence + 0.03);
        firm.emotions.greed = Math.min(1, firm.emotions.greed + 0.02);
    }

    updateRiskTolerance(firm, outcome);
}

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

function getTradeShares(firm, price) {
    const maxShares = Math.floor((firm.balance * firm.riskTolerance) / price);
    if (maxShares <= 0) return 0;
    return Math.max(1, Math.floor(maxShares * (0.3 + 0.7 * Math.random())));
}

// -- 2. Should Sell: More Aggressive, Rebalance, and Take Profits --
// - More frequent, lower thresholds, plus forced periodic rebalance
function shouldSell(firm, stock, currentTick) {
    const mem = firm.memory?.[stock.ticker];
    if (!mem || !mem.recentPrices.length) return false;
    const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
    const gain = (stock.price - avgBuy) / avgBuy;
    const holdingPeriod = (currentTick - (mem.boughtAtTick || currentTick));

    // 3. Lowered thresholds: take profit or stop loss quickly
    if (gain > 0.035 && holdingPeriod >= 2) return true;   // Profit at +3.5%
    if (gain < -0.025) return true;  // Stop loss at -2.5%
    // 4. If cash below 10% of start, force sell
    if (firm.balance < 10000) return true;
    // 5. Every 4th tick, rebalance: sell biggest unrealized winner
    if (currentTick % 4 === 0 && gain > 0) return true;
    // Add random churn
    if (Math.random() < 0.11) return true;
    return false;
}

function shouldBuy(firm, stock) {
    const mem = firm.memory?.[stock.ticker];
    if (!mem || !mem.recentPrices.length) return true;
    const recent = mem.recentPrices.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return stock.price < avg * 0.98; // Only buy if 2% below recent avg
}

const strategies = {
    // All strategies use the same selling improvements now!
    momentum: async (firm, mood, econ, currentTick) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom") buyBias += 0.08;
        if (econ.macroEvent === "recession") sellBias += 0.12;
        const top = await Stock.find().sort({ change: -1 }).limit(5);
        const buy = randomElement(top);

        let buyResult = null;
        if (Math.random() < buyBias && buy && firm.balance > buy.price && shouldBuy(firm, buy)) {
            buyResult = await executeFirmTrade(firm, buy, 'buy', econ, currentTick);
        }

        // Try to sell any eligible holding
        const owned = Object.keys(firm.ownedShares || {});
        let sellResult = null;
        // Sell biggest winner if forced rebalance tick
        let bestTicker = null, bestGain = -Infinity;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            const mem = firm.memory?.[ticker];
            if (!s || !mem) continue;
            const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
            const gain = (s.price - avgBuy) / avgBuy;
            if (gain > bestGain) { bestGain = gain; bestTicker = ticker; }
            if (shouldSell(firm, s, currentTick)) {
                sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
                break;
            }
        }
        // Rebalance: force sell biggest winner occasionally
        if (!sellResult && owned.length > 0 && currentTick % 4 === 0 && bestTicker) {
            const s = await Stock.findOne({ ticker: bestTicker });
            sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
        }
        return buyResult || sellResult || null;
    },

    // All other strategies now share improved logic
    contrarian: async (firm, mood, econ, currentTick) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "recession") buyBias += 0.06;
        if (econ.macroEvent === "boom") sellBias += 0.05;
        const bottom = await Stock.find().sort({ change: 1 }).limit(5);
        const buy = randomElement(bottom);

        let buyResult = null;
        if (Math.random() < buyBias && buy && firm.balance > buy.price && shouldBuy(firm, buy)) {
            buyResult = await executeFirmTrade(firm, buy, 'buy', econ, currentTick);
        }
        const owned = Object.keys(firm.ownedShares || {});
        let sellResult = null;
        let bestTicker = null, bestGain = -Infinity;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            const mem = firm.memory?.[ticker];
            if (!s || !mem) continue;
            const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
            const gain = (s.price - avgBuy) / avgBuy;
            if (gain > bestGain) { bestGain = gain; bestTicker = ticker; }
            if (shouldSell(firm, s, currentTick)) {
                sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
                break;
            }
        }
        if (!sellResult && owned.length > 0 && currentTick % 4 === 0 && bestTicker) {
            const s = await Stock.findOne({ ticker: bestTicker });
            sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
        }
        return buyResult || sellResult || null;
    },

    growth: async (firm, mood, econ, currentTick) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom") buyBias += 0.07;
        if (econ.macroEvent === "recession") sellBias += 0.09;
        const growth = await Stock.find().sort({ eps: -1 }).limit(5);
        const buy = randomElement(growth);

        let buyResult = null;
        if (Math.random() < buyBias && buy && firm.balance > buy.price && shouldBuy(firm, buy)) {
            buyResult = await executeFirmTrade(firm, buy, 'buy', econ, currentTick);
        }
        const owned = Object.keys(firm.ownedShares || {});
        let sellResult = null;
        let bestTicker = null, bestGain = -Infinity;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            const mem = firm.memory?.[ticker];
            if (!s || !mem) continue;
            const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
            const gain = (s.price - avgBuy) / avgBuy;
            if (gain > bestGain) { bestGain = gain; bestTicker = ticker; }
            if (shouldSell(firm, s, currentTick)) {
                sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
                break;
            }
        }
        if (!sellResult && owned.length > 0 && currentTick % 4 === 0 && bestTicker) {
            const s = await Stock.findOne({ ticker: bestTicker });
            sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
        }
        return buyResult || sellResult || null;
    },

    volatility: async (firm, mood, econ, currentTick) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom" || econ.inflationRate > 0.04) buyBias += 0.05;
        if (econ.macroEvent === "recession" || econ.inflationRate > 0.05) sellBias += 0.07;
        const volatile = await Stock.find().sort({ volatility: -1 }).limit(5);
        const buy = randomElement(volatile);

        let buyResult = null;
        if (Math.random() < buyBias && buy && firm.balance > buy.price && shouldBuy(firm, buy)) {
            buyResult = await executeFirmTrade(firm, buy, 'buy', econ, currentTick);
        }
        const owned = Object.keys(firm.ownedShares || {});
        let sellResult = null;
        let bestTicker = null, bestGain = -Infinity;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            const mem = firm.memory?.[ticker];
            if (!s || !mem) continue;
            const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
            const gain = (s.price - avgBuy) / avgBuy;
            if (gain > bestGain) { bestGain = gain; bestTicker = ticker; }
            if (shouldSell(firm, s, currentTick)) {
                sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
                break;
            }
        }
        if (!sellResult && owned.length > 0 && currentTick % 4 === 0 && bestTicker) {
            const s = await Stock.findOne({ ticker: bestTicker });
            sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
        }
        return buyResult || sellResult || null;
    },

    balanced: async (firm, mood, econ, currentTick) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom") buyBias += 0.05;
        if (econ.macroEvent === "recession") sellBias += 0.09;
        const [buy] = await Stock.aggregate([{ $sample: { size: 1 } }]);

        let buyResult = null;
        if (Math.random() < buyBias && buy && firm.balance > buy.price && shouldBuy(firm, buy)) {
            buyResult = await executeFirmTrade(firm, buy, 'buy', econ, currentTick);
        }
        const owned = Object.keys(firm.ownedShares || {});
        let sellResult = null;
        let bestTicker = null, bestGain = -Infinity;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            const mem = firm.memory?.[ticker];
            if (!s || !mem) continue;
            const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
            const gain = (s.price - avgBuy) / avgBuy;
            if (gain > bestGain) { bestGain = gain; bestTicker = ticker; }
            if (shouldSell(firm, s, currentTick)) {
                sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
                break;
            }
        }
        if (!sellResult && owned.length > 0 && currentTick % 4 === 0 && bestTicker) {
            const s = await Stock.findOne({ ticker: bestTicker });
            sellResult = await executeFirmTrade(firm, s, 'sell', econ, currentTick);
        }
        return buyResult || sellResult || null;
    }
};

const executeFirmTrade = async (firm, stock, action, econ, currentTick) => {
    if (!stock) return null;
    firm.ownedShares = firm.ownedShares || {};
    firm.transactions = firm.transactions || [];
    firm.memory = firm.memory || {};
    firm.emotions = firm.emotions || { confidence: 0.5, frustration: 0, greed: 0.5, regret: 0 };

    const currentShares = firm.ownedShares[stock.ticker] || 0;
    let outcome = "neutral";
    let realizedPL = 0;

    if (action === "buy") {
        const shares = getTradeShares(firm, stock.price);
        if (shares <= 0) return null;
        firm.balance -= shares * stock.price;
        firm.ownedShares[stock.ticker] = currentShares + shares;
        firm.transactions.push({
            type: "buy", ticker: stock.ticker, shares, price: stock.price, total: shares * stock.price, date: currentTick
        });
    } else {
        if (currentShares <= 0) return null;
        // 2. More dynamic selling: random portion, always at least 1
        const sharesToSell = getSellPortion(currentShares);
        const proceeds = sharesToSell * stock.price;
        firm.balance += proceeds;
        const remaining = currentShares - sharesToSell;
        if (remaining > 0) firm.ownedShares[stock.ticker] = remaining;
        else delete firm.ownedShares[stock.ticker];
        firm.transactions.push({
            type: "sell", ticker: stock.ticker, shares: sharesToSell, price: stock.price, total: proceeds, date: currentTick
        });

        // Calculate win/loss for memory
        const mem = firm.memory[stock.ticker];
        if (mem && mem.recentPrices && mem.recentPrices.length) {
            const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
            realizedPL = stock.price - avgBuy;
            outcome = realizedPL > 0 ? "win" : (realizedPL < 0 ? "loss" : "neutral");
        }
    }

    updateMemoryAndEmotions(firm, stock, action, stock.price, econ, outcome);

    firm.markModified("ownedShares");
    firm.markModified("memory");
    firm.markModified("emotions");
    await firm.save();
    return { ticker: stock.ticker, shares: 1 };
};

const processFirms = async (marketMood) => {
    try {
        const firms = await Firm.find();
        const allTrades = [];
        const currentTick = getCurrentTick();
        const econ = getEconomicFactors();
        const herdBuys = [];

        for (const firm of firms) {
            if (
                typeof firm.lastTradeCycle === "number" &&
                typeof firm.tradingFrequency === "number" &&
                currentTick - firm.lastTradeCycle < firm.tradingFrequency
            ) {
                continue;
            }
            const strategyFn = strategies[firm.strategy];
            let trade;

            if (Math.random() < 0.05 && herdBuys.length > 0) {
                const { ticker } = randomElement(herdBuys);
                const stock = await Stock.findOne({ ticker });
                trade = await executeFirmTrade(firm, stock, 'buy', econ, currentTick);
                if (trade) trade.herd = true;
            } else if (strategyFn) {
                trade = await strategyFn(firm, marketMood, econ, currentTick);
            }

            if (trade) {
                firm.lastTradeCycle = currentTick;
                await firm.save();
                allTrades.push(trade);
                if (trade && !trade.herd) herdBuys.push({ ticker: trade.ticker });
            }
        }

        return allTrades.reduce((acc, t) => {
            acc[t.ticker] = (acc[t.ticker] || 0) + t.shares;
            return acc;
        }, {});
    } catch (err) {
        console.error("Error processing firms:", err);
        return {};
    }
};

module.exports = { processFirms };
