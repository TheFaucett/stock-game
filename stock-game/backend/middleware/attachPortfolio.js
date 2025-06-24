// middleware/attachPortfolio.js
const findOrCreatePortfolio = require('../utils/findOrCreatePortfolio');

async function attachPortfolio(req, res, next) {
  try {
    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    req.portfolio = await findOrCreatePortfolio(userId);
    next();
  } catch (err) {
    console.error('Portfolio middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = attachPortfolio;
