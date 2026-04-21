const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, alertController.getAlerts);
router.put('/:id/read', authMiddleware, alertController.markAsRead);
router.delete('/:id', authMiddleware, alertController.deleteAlert);

module.exports = router;
