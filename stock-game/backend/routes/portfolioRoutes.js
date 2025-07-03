const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');

// 📌 Watchlist Endpoints
router.post('/:userId/watchlist/:ticker/add', portfolioController.addToWatchlist);
router.delete('/:userId/watchlist/:ticker/delete', portfolioController.removeFromWatchlist);
router.get('/:userId/watchlist', portfolioController.getWatchlist);


// 📌 Portfolio Endpoints
router.get('/:userId', portfolioController.getPortfolio); // Ensure the route is here!
router.post('/:userId/transactions', portfolioController.executeTransaction);
router.post('/sync-shares', portfolioController.syncShares);




module.exports = router;
