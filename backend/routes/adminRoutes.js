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

const {
  getSuspiciousUsers,
  sendWarning,
  disableUser
} = require('../controllers/fraudController');

// ── Analytics ────────────────────────────────────────────────
router.get('/analytics/summary', getSummary);
router.get('/analytics/users',   getUserAnalytics);
router.get('/analytics/trades',  getTradeAnalytics);
router.get('/analytics/sectors', getSectorAnalytics);
router.get('/analytics/stocks',  getStockAnalytics);
router.get('/analytics/alerts',  getAlertAnalytics);

// ── Fraud Detection ──────────────────────────────────────────
router.get('/fraud/users',    getSuspiciousUsers);
router.post('/fraud/warn',    sendWarning);
router.post('/fraud/disable', disableUser);

// ── Admin Controls ───────────────────────────────────────────
router.post('/stocks/control',        controlStock);
router.post('/users/:id/balance',     adjustUserBalance);

module.exports = router;
