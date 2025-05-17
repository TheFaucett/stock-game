const Bank      = require('../models/Bank');
const Portfolio = require('../models/Portfolio');
const { getCurrentTick } = require('../utils/tickTracker');

// APR per tick defaults
const DEFAULT_DEPOSIT_RATE = 0.02;
const DEFAULT_LOAN_RATE    = 0.05;

// ensure a single Bank doc exists
async function getOrCreateBank() {
  let bank = await Bank.findOne();
  if (!bank) bank = await Bank.create({ loans: [], deposits: [] });
  return bank;
}

// GET /api/bank/:userId
// returns this player’s loans & deposits
exports.getBankForPortfolio = async (req, res) => {
  try {
    const { userId } = req.params;
    const bank = await getOrCreateBank();
    const loans    = bank.loans.filter(l => l.portfolioId.toString() === userId);
    const deposits = bank.deposits.filter(d => d.portfolioId.toString() === userId);
    res.json({ loans, deposits });
  } catch (err) {
    console.error('Bank lookup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/bank/:userId/deposit
// Body: { amount, rate? }
exports.deposit = async (req, res) => {
  try {
    const { userId } = req.params;
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
    portfolio.balance -= amount;

    bank.deposits.push({
      portfolioId: portfolio._id,
      amount,
      rate: rate ?? DEFAULT_DEPOSIT_RATE,
      startTick: getCurrentTick(),
      closed: false,
      withdrawals: []
    });

    await Promise.all([portfolio.save(), bank.save()]);
    res.json({ balance: portfolio.balance });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/bank/:userId/loan
// Body: { amount, term, rate? }
exports.takeLoan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, term, rate } = req.body;

    if (
      !userId ||
      typeof amount !== 'number' || amount <= 0 ||
      typeof term   !== 'number' || term   <= 0
    ) {
      return res.status(400).json({ error: 'Invalid userId, amount, or term' });
    }

    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const bank = await getOrCreateBank();
    portfolio.balance += amount;

    bank.loans.push({
      portfolioId: portfolio._id,
      amount,             // original principal
      balance: amount,    // remaining principal
      term,
      rate: rate ?? DEFAULT_LOAN_RATE,
      startTick: getCurrentTick(),
      closed: false,
      payments: []
    });

    await Promise.all([portfolio.save(), bank.save()]);
    res.json({ balance: portfolio.balance });
  } catch (err) {
    console.error('Loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
// POST /api/bank/:userId/withdraw
// Body: { amount }
// Player pulls cash back from their oldest open deposit
exports.withdraw = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    if (!userId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid userId or amount' });
    }

    // 1️⃣ load portfolio
    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // 2️⃣ load bank + find an open deposit for this user
    const bank = await getOrCreateBank();
    const deposit = bank.deposits.find(d =>
      d.portfolioId.toString() === portfolio._id.toString() && !d.closed
    );
    if (!deposit || deposit.amount < amount) {
      return res.status(400).json({ error: 'No sufficient open deposit to withdraw' });
    }

    // 3️⃣ debit deposit, credit portfolio
    deposit.amount    -= amount;
    deposit.withdrawals.push({
      tick: getCurrentTick(),
      amount,
      date: new Date()
    });
    if (deposit.amount === 0) deposit.closed = true;

    portfolio.balance += amount;

    // 4️⃣ persist both
    await Promise.all([ bank.save(), portfolio.save() ]);
    res.json({ balance: portfolio.balance, remainingDeposit: deposit.amount });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};