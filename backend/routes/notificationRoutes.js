// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead } = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

router.get('/:user_id', authMiddleware, getNotifications);
router.put('/mark-read', authMiddleware, markAsRead);

module.exports = router;
