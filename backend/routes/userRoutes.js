// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { getUserSettings, updateUserSettings } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Protected routes using auth middleware
router.get('/settings', authMiddleware, getUserSettings);
router.put('/settings', authMiddleware, updateUserSettings);

module.exports = router;
