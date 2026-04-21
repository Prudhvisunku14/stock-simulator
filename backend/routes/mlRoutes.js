// routes/mlRoutes.js
const express = require('express');
const router = express.Router();
const { predict, getPatterns } = require('../controllers/mlController');
const authMiddleware = require('../middleware/auth');

router.post('/predict', authMiddleware, predict);
router.get('/patterns/:stock_symbol', authMiddleware, getPatterns);

module.exports = router;
