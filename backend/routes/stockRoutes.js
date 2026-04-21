// routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllStocks, 
  getMarketData, 
  saveMarketData, 
  getYahooMarketData,
  getStockTrends,
  getStocksBySector,
  getTopGainers,
  getTopLosers,
  getMostActive
} = require('../controllers/stockController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getAllStocks);
router.get('/trends', authMiddleware, getStockTrends);
router.get('/sector/:sector', authMiddleware, getStocksBySector);
router.get('/top-gainers', authMiddleware, getTopGainers);
router.get('/top-losers', authMiddleware, getTopLosers);
router.get('/most-active', authMiddleware, getMostActive);
router.get('/market-data/:stock_symbol', authMiddleware, getMarketData);
router.post('/market-data/fetch', authMiddleware, saveMarketData);

// Yahoo Finance hybrid route
router.get('/yahoo/:symbol', authMiddleware, getYahooMarketData);

module.exports = router;
