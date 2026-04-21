// middleware/auth.js
// Middleware to verify JWT token on protected routes

const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // CRITICAL: Check if user exists and fetch role
    const { query } = require('../config/db');
    const userResult = await query('SELECT id, role FROM users WHERE id = $1', [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    const user = userResult.rows[0];

    // Attach user info to request
    req.user = { id: user.id, role: user.role };
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    res.status(500).json({ success: false, message: 'Auth error', error: error.message });
  }
};

module.exports = authMiddleware;
