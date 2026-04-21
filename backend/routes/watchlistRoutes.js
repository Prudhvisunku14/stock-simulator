// routes/watchlistRoutes.js
const express = require('express');
const router = express.Router();
const { addToWatchlist, getWatchlist, removeFromWatchlist } = require('../controllers/watchlistController');
const authMiddleware = require('../middleware/auth');

router.post('/add', authMiddleware, addToWatchlist);
router.get('/:user_id', authMiddleware, getWatchlist);
router.delete('/remove', authMiddleware, removeFromWatchlist);

module.exports = router;
