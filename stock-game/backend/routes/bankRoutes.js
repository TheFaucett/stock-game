// routes/bank.js
const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');

// GET   /api/bank/:userId
//   → returns this player’s loans & deposits
router.get('/:userId', bankController.getBankForPortfolio);

// POST  /api/bank/:userId/deposit
// Body: { amount: Number, rate?: Number }
router.post('/:userId/deposit', bankController.deposit);

router.post('/:userId/withdraw', bankController.withdraw);

// POST  /api/bank/:userId/loan
// Body: { amount: Number, term: Number, rate?: Number }
router.post('/:userId/loan',    bankController.takeLoan);


module.exports = router;
