const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');

router.get('/', portfolioController.getPortfolio); // Ensure the route is here!
router.post('/transaction', portfolioController.executeTransaction);
router.post('/sync-shares', portfolioController.syncShares);

module.exports = router;
