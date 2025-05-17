// utils/sweepLoans.js
const Bank      = require('../models/Bank');
const Portfolio = require('../models/Portfolio');
const { getCurrentTick } = require('./tickTracker');

async function sweepLoanPayments(currentTick) {
  const bank = await Bank.findOne();
  if (!bank) return;

  // Only run if there's at least one outstanding, unclosed loan
  const hasActiveLoan = bank.loans.some(loan =>
    loan.closed !== true && typeof loan.amount === 'number' && loan.amount > 0
  );
  if (!hasActiveLoan) {
    console.log('🔕 No active loans to sweep at tick', currentTick);
    return;
  }

  let bankDirty = false;

  for (const loan of bank.loans) {
    if (loan.closed) continue;

    console.log(`🔍 Loan ${loan._id} →`, {
      amount:    loan.amount,
      term:      loan.term,
      balance:   loan.balance,
      rate:      loan.rate,
      startTick: loan.startTick
    });

    if (typeof loan.amount !== 'number' || typeof loan.term !== 'number') {
      console.warn('  ⚠️ Skipping loan with invalid amount or term');
      continue;
    }

    const age = currentTick - loan.startTick;
    if (age <= 0 || age > loan.term) {
      if (age > loan.term && !loan.closed) {
        loan.closed = true;
        bankDirty = true;
        console.log(`  🔒 Loan ${loan._id} expired at tick ${currentTick}`);
      }
      continue;
    }

    const principalPortion = loan.amount / loan.term;
    const interestPortion  = loan.balance * loan.rate;
    const payment          = principalPortion + interestPortion;

    console.log('  💳 Payment breakdown →',
      `principal=${principalPortion.toFixed(2)}`,
      `interest=${interestPortion.toFixed(2)}`,
      `total=${payment.toFixed(2)}`
    );

    const portfolio = await Portfolio.findById(loan.portfolioId);
    if (!portfolio) {
      console.warn(`  ⚠️ Portfolio ${loan.portfolioId} not found`);
      continue;
    }
    if (portfolio.balance < payment) {
      console.warn(
        `  ⚠️ Insufficient funds (${portfolio.balance.toFixed(2)} < ${payment.toFixed(2)})`
      );
      continue;
    }

    // Debit player and reduce principal
    portfolio.balance -= payment;
    loan.balance      = Math.max(loan.balance - principalPortion, 0);

    // Log payment inside the loan
    loan.payments = loan.payments || [];
    loan.payments.push({
      tick:      currentTick,
      principal: principalPortion,
      interest:  interestPortion,
      total:     payment
    });

    if (loan.balance === 0) {
      loan.closed = true;
      console.log(`  ✅ Loan ${loan._id} fully repaid at tick ${currentTick}`);
    }

    await portfolio.save();
    bankDirty = true;
  }

  if (bankDirty) {
    await bank.save();
    console.log('🔄 Bank document saved after loan sweep.');
  }
}

module.exports = { sweepLoanPayments };
