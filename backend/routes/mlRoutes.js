const express = require('express');
const router = express.Router();
const { predict, getPatterns } = require('../controllers/mlController');

router.post('/predict', predict);
router.get('/patterns/:stock_symbol', getPatterns);

module.exports = router;
