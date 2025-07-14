const Stock = require("../models/Stock");
const Firm = require("../models/Firm");
const { getCurrentTick } = require("../utils/tickTracker.js");
const { getEconomicFactors } = require("../utils/economicEnvironment.js");

function getMoodBias(mood) {
    return {
        buyBias: 0.4 + mood,
        sellBias: 0.6 - mood,
    };
}

function updateRiskTolerance(firm, outcome) {
    if (typeof firm.riskTolerance !== "number") firm.riskTolerance = 0.15 + Math.random() * 0.25;
    if (outcome === "win") {
        firm.riskTolerance = Math.min(0.8, firm.riskTolerance + 0.05);
    } else if (outcome === "loss") {
        firm.riskTolerance = Math.max(0.05, firm.riskTolerance - 0.05);
    }
}

function updateMemoryAndEmotions(firm, stock, action, tradePrice, econ, outcome) {
    if (!firm.memory) firm.memory = {};
    const ticker = stock.ticker;
    const m = firm.memory[ticker] || { recentPrices: [], lastOutcome: 'neutral' };
    m.recentPrices.push(tradePrice);
    if (m.recentPrices.length > 10) m.recentPrices.shift();
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

// --- New: Should Sell Helper (profit/loss/holding period logic) ---
function shouldSell(firm, stock) {
    const mem = firm.memory?.[stock.ticker];
    if (!mem || !mem.recentPrices?.length) return false;
    const avgBuy = mem.recentPrices.reduce((a, b) => a + b, 0) / mem.recentPrices.length;
    const gain = (stock.price - avgBuy) / avgBuy;
    if (gain > 0.09) return true;   // Take profit at +9%
    if (gain < -0.07) return true;  // Stop loss at -7%
    // Add a random trigger to ensure some selling
    if (Math.random() < 0.07) return true;
    return false;
}

// --- Strategies ---
const strategies = {
    momentum: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom") buyBias += 0.08;
        if (econ.macroEvent === "recession") sellBias += 0.10;

        const top = await Stock.find().sort({ change: -1 }).limit(5);
        const bottom = await Stock.find().sort({ change: 1 }).limit(5);
        const buy = randomElement(top);

        // Improved sell: always consider if any holding meets shouldSell
        const owned = Object.keys(firm.ownedShares || {});
        let sell = null;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            if (s && shouldSell(firm, s)) { sell = s; break; }
        }
        if (!sell && owned.length > 0 && Math.random() < sellBias) {
            const s = await Stock.findOne({ ticker: randomElement(owned) });
            sell = s;
        }

        if (Math.random() < buyBias && buy && firm.balance > buy.price) return executeFirmTrade(firm, buy, 'buy', econ);
        if (sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    },

    // All other strategies can use similar improved selling logic!
    contrarian: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "recession") buyBias += 0.05;
        if (econ.macroEvent === "boom") sellBias += 0.04;

        const bottom = await Stock.find().sort({ change: 1 }).limit(5);
        const buy = randomElement(bottom);

        // Improved sell logic
        const owned = Object.keys(firm.ownedShares || {});
        let sell = null;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            if (s && shouldSell(firm, s)) { sell = s; break; }
        }
        if (!sell && owned.length > 0 && Math.random() < sellBias) {
            const s = await Stock.findOne({ ticker: randomElement(owned) });
            sell = s;
        }

        if (Math.random() < buyBias && buy && firm.balance > buy.price) return executeFirmTrade(firm, buy, 'buy', econ);
        if (sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    },

    growth: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom") buyBias += 0.06;
        if (econ.macroEvent === "recession") sellBias += 0.08;

        const growth = await Stock.find().sort({ eps: -1 }).limit(5);
        const buy = randomElement(growth);

        const owned = Object.keys(firm.ownedShares || {});
        let sell = null;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            if (s && shouldSell(firm, s)) { sell = s; break; }
        }
        if (!sell && owned.length > 0 && Math.random() < sellBias) {
            const s = await Stock.findOne({ ticker: randomElement(owned) });
            sell = s;
        }

        if (Math.random() < buyBias && buy && firm.balance > buy.price) return executeFirmTrade(firm, buy, 'buy', econ);
        if (sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    },

    volatility: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom" || econ.inflationRate > 0.04) buyBias += 0.04;
        if (econ.macroEvent === "recession" || econ.inflationRate > 0.05) sellBias += 0.05;

        const volatile = await Stock.find().sort({ volatility: -1 }).limit(5);
        const buy = randomElement(volatile);

        const owned = Object.keys(firm.ownedShares || {});
        let sell = null;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            if (s && shouldSell(firm, s)) { sell = s; break; }
        }
        if (!sell && owned.length > 0 && Math.random() < sellBias) {
            const s = await Stock.findOne({ ticker: randomElement(owned) });
            sell = s;
        }

        if (Math.random() < buyBias && buy && firm.balance > buy.price) return executeFirmTrade(firm, buy, 'buy', econ);
        if (sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    },

    balanced: async (firm, mood, econ) => {
        let { buyBias, sellBias } = getMoodBias(mood);
        if (econ.macroEvent === "boom") buyBias += 0.04;
        if (econ.macroEvent === "recession") sellBias += 0.04;

        const [buy] = await Stock.aggregate([{ $sample: { size: 1 } }]);
        const owned = Object.keys(firm.ownedShares || {});
        let sell = null;
        for (let ticker of owned) {
            const s = await Stock.findOne({ ticker });
            if (s && shouldSell(firm, s)) { sell = s; break; }
        }
        if (!sell && owned.length > 0 && Math.random() < sellBias) {
            const s = await Stock.findOne({ ticker: randomElement(owned) });
            sell = s;
        }

        if (Math.random() < buyBias && buy && firm.balance > buy.price) return executeFirmTrade(firm, buy, 'buy', econ);
        if (sell) return executeFirmTrade(firm, sell, 'sell', econ);
        return null;
    }
};

// --- Execute Trade with New Logic ---
const executeFirmTrade = async (firm, stock, action, econ) => {
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
            type: "buy", ticker: stock.ticker, shares, price: stock.price, total: shares * stock.price, date: getCurrentTick()
        });
    } else {
        if (currentShares <= 0) return null;
        const sharesToSell = Math.max(1, Math.ceil(currentShares * (firm.riskTolerance || 0.2)));
        const proceeds = sharesToSell * stock.price;
        firm.balance += proceeds;
        const remaining = currentShares - sharesToSell;
        if (remaining > 0) firm.ownedShares[stock.ticker] = remaining;
        else delete firm.ownedShares[stock.ticker];
        firm.transactions.push({
            type: "sell", ticker: stock.ticker, shares: sharesToSell, price: stock.price, total: proceeds, date: getCurrentTick()
        });

        // Calculate win/loss using memory of entry price
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

        // Herding (optional)
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

            // Herding: occasionally copy a random other buy
            if (Math.random() < 0.05 && herdBuys.length > 0) {
                const { ticker } = randomElement(herdBuys);
                const stock = await Stock.findOne({ ticker });
                trade = await executeFirmTrade(firm, stock, 'buy', econ);
                if (trade) trade.herd = true;
            } else if (strategyFn) {
                trade = await strategyFn(firm, marketMood, econ);
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
