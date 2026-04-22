// server.js
// Main entry point for Stock Simulator Backend

const express = require('express');
const cors    = require('cors');
const http    = require('http');
require('dotenv').config();

const app = express();

// ─── CORS ─────────────────────────────────────────────────────
// FIX: CORS was defined but never added as middleware!
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/user',          require('./routes/userRoutes'));
app.use('/api/stocks',        require('./routes/stockRoutes'));
app.use('/api/watchlist',     require('./routes/watchlistRoutes'));
app.use('/api/ml',            require('./routes/mlRoutes'));
app.use('/api/trades',        require('./routes/tradeRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/alerts',        require('./routes/alertRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Stock Simulator API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// ─── Start Server ─────────────────────────────────────────────
const socketService = require('./services/socketService');
const alertEngine   = require('./services/alertEngine');
const fraudEngine   = require('./services/fraudDetectionEngine');
const volatilityService = require('./services/volatilityService');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

// Start Background Services
alertEngine.start();
fraudEngine.start();
volatilityService.start();

server.listen(PORT, () => {
  console.log(`\n🚀 Stock Simulator Backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS allowed origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📋 Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = server;
