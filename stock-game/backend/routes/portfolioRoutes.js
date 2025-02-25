const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');

router.get('/:userId', portfolioController.getPortfolio); // Ensure the route is here!
router.post('/:userId/transactions', portfolioController.executeTransaction);
router.post('/sync-shares', portfolioController.syncShares);


// 📌 Watchlist Endpoints
router.get('/:userId/watchlist', portfolioController.getWatchlist);
router.post('/:userId/watchlist', portfolioController.addToWatchlist);
router.delete('/:userId/watchlist/:ticker', portfolioController.removeFromWatchlist);

module.exports = router;
