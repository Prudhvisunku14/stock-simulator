// routes/adminRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getUserAnalytics,
  getTradeAnalytics,
  getSectorAnalytics,
  getStockAnalytics,
  getAlertAnalytics,
  getSummary,
  controlStock,
  adjustUserBalance
} = require('../controllers/adminController');

const authMiddleware  = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminMiddleware');

// Protect ALL admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// ── Analytics ────────────────────────────────────────────────
router.get('/analytics/summary', getSummary);
router.get('/analytics/users',   getUserAnalytics);
router.get('/analytics/trades',  getTradeAnalytics);
router.get('/analytics/sectors', getSectorAnalytics);
router.get('/analytics/stocks',  getStockAnalytics);
router.get('/analytics/alerts',  getAlertAnalytics);

// ── Admin Controls ───────────────────────────────────────────
router.post('/stocks/control',        controlStock);
router.post('/users/:id/balance',     adjustUserBalance);

module.exports = router;
