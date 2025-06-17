// controllers/bankController.js

const Bank      = require('../models/Bank');
const Portfolio = require('../models/Portfolio');
const { getCurrentTick } = require('../utils/tickTracker');


async function getPortfolioValue(portfolio) {
  // Portfolio must include current stock ownedShares.
  // Example assumes portfolio.ownedShares = [{ ticker, shares }]
  // and you track shares per ticker.
  // If your schema differs, adjust accordingly!
  let stocksValue = 0;
  if (portfolio.ownedShares && Array.isArray(portfolio.ownedShares) && portfolio.ownedShares.length > 0) {
    const tickers = portfolio.ownedShares.map(h => h.ticker);
    const stocks = await Stock.find({ ticker: { $in: tickers } }, { ticker: 1, price: 1 });
    stocksValue = stocks.reduce((sum, stock) => {
      const holding = portfolio.ownedShares.find(h => h.ticker === stock.ticker);
      return sum + (holding ? holding.shares * stock.price : 0);
    }, 0);
  }
  return (portfolio.balance || 0) + stocksValue;
}

// APR‑per‑tick defaults
const DEFAULT_DEPOSIT_RATE = 0.02;
const DEFAULT_LOAN_RATE    = 0.05;

/**
 * Ensure there's exactly one Bank document in the DB.
 */
async function getOrCreateBank() {
  let bank = await Bank.findOne();
  if (!bank) bank = await Bank.create({ loans: [], deposits: [] });
  return bank;
}

/**
 * GET /api/bank/:userId
 * Returns this user’s loans & deposits
 */
exports.getBankForPortfolio = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1️⃣ find the portfolio record for this user
    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // 2️⃣ load (or create) the single bank doc
    const bank = await getOrCreateBank();

    // 3️⃣ now filter by portfolio._id
    const pid      = portfolio._id.toString();
    const loans    = bank.loans.filter(l => l.portfolioId.toString() === pid);
    const deposits = bank.deposits.filter(d => d.portfolioId.toString() === pid);

    // 4️⃣ return them
    res.json({ loans, deposits });

  } catch (err) {
    console.error('Bank lookup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
/**
 * POST /api/bank/:userId/deposit
 * Body: { amount, rate? }
 * Player deposits cash into the bank (balance ↓, deposit record ↑)
 */
exports.deposit = async (req, res) => {
  try {
    const { userId }    = req.params;
    const { amount, rate } = req.body;

    if (!userId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid userId or amount' });
    }

    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    if (portfolio.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const bank = await getOrCreateBank();

    // 1️⃣ debit the player’s cash
    portfolio.balance -= amount;

    // 2️⃣ record the deposit
    bank.deposits.push({
      portfolioId: portfolio._id,
      amount,
      rate:       rate ?? DEFAULT_DEPOSIT_RATE,
      startTick:  getCurrentTick(),
      closed:     false,
      withdrawals:[]
    });

    await Promise.all([ portfolio.save(), bank.save() ]);
    res.json({ balance: portfolio.balance });
  }
  catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/bank/:userId/loan
 * Body: { amount, term, rate? }
 * Player takes out a loan (balance ↑, loan record ↑)
 */
exports.takeLoan = async (req, res) => {
  try {
    const { userId }      = req.params;
    const { amount, term, rate } = req.body;

    if (
      !userId ||
      typeof amount !== 'number' || amount <= 0 ||
      typeof term   !== 'number' || term   <= 0
    ) {
      console.error(amount, term );
      return res.status(400).json({ error: 'Invalid userId, amount, or term' });
    }

    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    // Calculate player's current net worth
    const portfolioValue = await getPortfolioValue(portfolio);

    // Load the bank doc and find outstanding loans
    const bank = await getOrCreateBank();
    const pid  = portfolio._id.toString();
    const outstandingLoans = bank.loans.filter(
      l => l.portfolioId.toString() === pid && !l.closed
    );
    const outstandingPrincipal = outstandingLoans.reduce((sum, loan) => sum + (loan.balance || 0), 0);

    // Set max borrow cap (e.g. 50% of net worth)
    const maxLoan = portfolioValue * 0.5;

    // Will this loan exceed the cap?
    if ((outstandingPrincipal + amount) > maxLoan) {
      return res.status(400).json({
        error: `Loan denied: max loan allowed is $${maxLoan.toFixed(2)} (50% of your net worth, including existing debt).`
      });
    }

    // Credit the player’s cash
    portfolio.balance += amount;

    // Record the loan
    bank.loans.push({
      portfolioId: portfolio._id,
      amount,            // original principal
      balance: amount,   // remaining principal
      term,              // in ticks
      rate: rate ?? DEFAULT_LOAN_RATE,
      startTick: getCurrentTick(),
      closed:   false,
      payments: []
    });

    await Promise.all([ portfolio.save(), bank.save() ]);
    res.json({ balance: portfolio.balance });
  }
  catch (err) {
    console.error('Loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/bank/:userId/deposit/:depositId/withdraw
 * Body: { amount }
 * Player pulls cash back from a specific deposit
 */
exports.withdraw = async (req, res) => {
  try {
    const { userId, depositId } = req.params;
    const { amount }            = req.body;

    if (!userId || !depositId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid userId, depositId, or amount' });
    }

    // 1️⃣ load portfolio
    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // 2️⃣ load bank + locate the deposit subdoc
    const bank    = await getOrCreateBank();
    const deposit = bank.deposits.id(depositId);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit record not found' });
    }
    if (deposit.closed) {
      return res.status(400).json({ error: 'Deposit already closed' });
    }

    // compute how much remains
    const withdrawnSoFar = (deposit.withdrawals || []).reduce((sum, w) => sum + w.amount, 0);
    const available      = deposit.amount - withdrawnSoFar;
    if (available < amount) {
      return res.status(400).json({ error: `Only $${available.toFixed(2)} available` });
    }

    // 3️⃣ debit deposit + credit portfolio
    deposit.withdrawals.push({
      tick:   getCurrentTick(),
      amount,
      date:   new Date()
    });
    if (available === amount) deposit.closed = true;

    portfolio.balance += amount;

    // 4️⃣ persist both
    await Promise.all([ portfolio.save(), bank.save() ]);

    res.json({
      balance:          portfolio.balance,
      remainingDeposit: available - amount
    });
  }
  catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
