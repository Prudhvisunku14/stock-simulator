// routes/tradeRoutes.js
const express = require('express');
const router = express.Router();
const { placeTrade, closeTrade, getPortfolio } = require('../controllers/tradeController');
const authMiddleware = require('../middleware/auth');

router.post('/place', authMiddleware, placeTrade);
router.post('/close', authMiddleware, closeTrade);
router.get('/portfolio/:user_id', authMiddleware, getPortfolio);

module.exports = router;
