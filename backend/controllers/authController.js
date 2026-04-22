// controllers/authController.js
// Handles email/password based authentication

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../config/db');
require('dotenv').config();

// ─────────────────────────────────────────
// POST /api/auth/signup
// Register a new user (supports role selection)
// ─────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { name, mobile_number, email, password, role } = req.body;

    if (!name || !email || !password || !mobile_number) {
      return res.status(400).json({
        success: false,
        message: 'Name, mobile number, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Sanitize role — only USER or ADMIN allowed
    const allowedRoles = ['USER', 'ADMIN'];
    const userRole = role && allowedRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'USER';

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR mobile_number = $2',
      [email, mobile_number]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or mobile number already exists'
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user (with role and receive_global_alerts)
    const newUserResult = await query(
      `INSERT INTO users (name, mobile_number, email, password, balance, role, receive_global_alerts)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, mobile_number, balance, role, receive_global_alerts, created_at`,
      [name, mobile_number, email, hashedPassword, 100000.00, userRole, false]
    );

    const user = newUserResult.rows[0];

    // Generate JWT token (valid 7 days)
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ New user registered: ${user.email} (role: ${user.role})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────
// POST /api/auth/login
// Login existing user
// ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user by email
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Check if user is disabled
    if (user.is_disabled) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been disabled. Please contact support.' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log activity
    await query(
      'INSERT INTO user_activity_logs (user_id, action, ip_address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [user.id, 'LOGIN', req.ip]
    ).catch(err => console.warn('Activity log failed (non-critical):', err.message));

    // Exclude password from response
    delete user.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────
// GET /api/auth/profile
// ─────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await query(
      'SELECT id, name, email, mobile_number, balance, role, receive_global_alerts, created_at FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    if (user.is_disabled) {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    res.json({ success: true, user });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────
// PATCH /api/auth/settings
// ─────────────────────────────────────────
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { receive_global_alerts } = req.body;

    if (typeof receive_global_alerts === 'undefined') {
      return res.status(400).json({ success: false, message: 'receive_global_alerts is required' });
    }

    const result = await query(
      'UPDATE users SET receive_global_alerts = $1 WHERE id = $2 RETURNING id, receive_global_alerts',
      [receive_global_alerts, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { signup, login, getProfile, updateSettings };
