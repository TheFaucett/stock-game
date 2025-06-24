// utils/findOrCreatePortfolio.js
const Portfolio = require('../models/Portfolio');

const STARTING_BALANCE = 10000; 

async function findOrCreatePortfolio(userId) {
  let portfolio = await Portfolio.findOne({ userId });
  if (!portfolio) {
    portfolio = await Portfolio.create({
      userId,
      balance: STARTING_BALANCE,
      ownedShares: {},
      borrowedShares: {},
      transactions: [],
      watchlist: [],
    });
    console.log(`Created new portfolio for userId ${userId} with $${STARTING_BALANCE}`);
  }
  return portfolio;
}

module.exports = findOrCreatePortfolio;
