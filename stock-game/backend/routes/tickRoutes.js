const express = require('express');
const router = express.Router();
const { getCurrentTick } = require('../utils/tickTracker.js');

router.get('/', (req, res) => {
    res.json({ tick: getCurrentTick()});
}); 

module.exports = router;