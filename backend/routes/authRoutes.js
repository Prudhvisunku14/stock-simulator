// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, login, getProfile, updateSettings } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/profile',    authMiddleware, getProfile);
router.patch('/settings', authMiddleware, updateSettings);
router.post('/settings',  authMiddleware, updateSettings); // Added POST support for flexibility

module.exports = router;
