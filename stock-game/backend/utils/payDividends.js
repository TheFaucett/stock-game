// utils/payDividends.js
const Stock = require("../models/Stock");
const Portfolio = require("../models/Portfolio");
const { getOrGenerateSampleTickers } = require("../utils/sampleStocks"); 
// Pay every ~quarter when called from market loop (tick % 90 === 0)
const PAYOUT_DAYS = 90; // number of "trading days" covered per payout
const DAYS_PER_YEAR = 365;

// Helpers
function entriesOf(mapOrObj) {
  if (!mapOrObj) return [];
  if (typeof mapOrObj.entries === "function") return Array.from(mapOrObj.entries());
  return Object.entries(mapOrObj);
}
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function round4(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }

// In-memory cache of last payout
let lastDividendSummary = null; 
// Structure:
// {
//   tick: 1230,
//   timestamp: 1712345678901,
//   totalPaid: 4523.32,
//   portfoliosPaid: 42,
//   perUser: { userId1: 35.12, userId2: 0, ... }
// }

async function payDividends(currentTick = null) {
  try {
    // 1) Fetch all portfolios (only fields we need)
    const portfolios = await Portfolio.find({}, {
      _id: 1, userId: 1, balance: 1, ownedShares: 1
    });

    if (!portfolios.length) {
      console.log("💤 No portfolios found — no dividends to pay.");
      return;
    }

    // 2) Collect tickers actually owned by anyone
    const tickers = new Set();
    for (const p of portfolios) {
      for (const [tkr, sh] of entriesOf(p.ownedShares)) {
        if (sh > 0) tickers.add(tkr);
      }
    }
    if (!tickers.size) {
      console.log("💤 No owned shares — no dividends to pay.");
      return;
    }

    // 3) Load those stocks in one query
    const stocks = await Stock.find(
      { ticker: { $in: [...sampleTickers] } },
      {
        _id: 1, ticker: 1, sector: 1, price: 1, basePrice: 1,
        volatility: 1, outstandingShares: 1, change: 1, nextEarningsTick: 1,
        history: { $slice: -10 } // adjust or make dynamic if you want
      }
    ).lean();

    const stockMap = new Map(stocks.map(s => [s.ticker, s]));

    // 4) Build bulk updates
    const ops = [];
    let totalPaid = 0;
    let portfoliosPaid = 0;
    const perUser = {};

    for (const p of portfolios) {
      const txs = [];
      let credit = 0;

      for (const [ticker, sharesOwned] of entriesOf(p.ownedShares)) {
        if (!sharesOwned || sharesOwned <= 0) continue;
        const st = stockMap.get(ticker);
        if (!st) continue;

        const annualYield = st.dividendYield || 0;
        if (annualYield <= 0) continue;

        const perShareForPeriod = st.price * annualYield * (PAYOUT_DAYS / DAYS_PER_YEAR);
        const amount = perShareForPeriod * sharesOwned;

        if (amount < 0.005) continue; // skip dust

        txs.push({
          type: "dividend",
          ticker,
          shares: Number(sharesOwned),
          price: round4(perShareForPeriod),  // per-share dividend
          total: round2(amount),             // total dividend for holding
          tickOpened: typeof currentTick === "number" ? currentTick : undefined
        });

        credit += amount;
      }

      if (txs.length > 0) {
        portfoliosPaid++;
        totalPaid += credit;
        perUser[p.userId] = round2(credit); // store per-user amount

        ops.push({
          updateOne: {
            filter: { _id: p._id },
            update: {
              $inc: { balance: round2(credit) },
              $push: { transactions: { $each: txs } }
            }
          }
        });
      } else {
        perUser[p.userId] = 0;
      }
    }

    if (ops.length) {
      await Portfolio.bulkWrite(ops);

      // Store summary for route/frontend access
      lastDividendSummary = {
        tick: currentTick ?? null,
        timestamp: Date.now(),
        totalPaid: round2(totalPaid),
        portfoliosPaid,
        perUser
      };

      console.log(`💸 Paid dividends to ${portfoliosPaid} portfolios. Total: $${round2(totalPaid).toFixed(2)}`);
    } else {
      console.log("💤 No dividend-eligible holdings this cycle.");
      lastDividendSummary = {
        tick: currentTick ?? null,
        timestamp: Date.now(),
        totalPaid: 0,
        portfoliosPaid: 0,
        perUser: {}
      };
    }

  } catch (err) {
    console.error("⚠️ Error paying dividends:", err);
  }
}

// Route helper
function getLastDividendSummary(userId = null) {
  if (!lastDividendSummary) return null;
  if (userId) {
    return {
      tick: lastDividendSummary.tick,
      timestamp: lastDividendSummary.timestamp,
      amount: lastDividendSummary.perUser[userId] ?? 0
    };
  }
  return lastDividendSummary;
}

module.exports = { payDividends, getLastDividendSummary };
