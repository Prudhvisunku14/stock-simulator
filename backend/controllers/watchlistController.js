
// controllers/watchlistController.js
// Manage user's watchlist

const { query } = require('../config/db');

// ─────────────────────────────────────────
// POST /api/watchlist/add
// Add a stock to watchlist
// ─────────────────────────────────────────
const addToWatchlist = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { stock_symbol } = req.body;

    if (!stock_symbol) {
      return res.status(400).json({ success: false, message: 'stock_symbol is required' });
    }

    // Check if stock exists
    const stockCheck = await query('SELECT symbol FROM stocks WHERE symbol = $1', [stock_symbol.toUpperCase()]);
    if (stockCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }

    // Add to watchlist (ignore if already exists)
    await query(
      'INSERT INTO watchlist (user_id, stock_symbol) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user_id, stock_symbol.toUpperCase()]
    );

    res.json({ success: true, message: `${stock_symbol} added to watchlist` });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding to watchlist', error: error.message });
  }
};

// ─────────────────────────────────────────
// GET /api/watchlist/:user_id
// Get user's watchlist with latest price
// ─────────────────────────────────────────
const getWatchlist = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await query(
      `SELECT 
        w.id,
        w.stock_symbol,
        w.added_at,
        s.company_name,
        s.exchange,
        s.sector,
        md.close_price as last_price,
        md.time as last_updated
       FROM watchlist w
       JOIN stocks s ON s.symbol = w.stock_symbol
       LEFT JOIN LATERAL (
         SELECT close_price, time FROM market_data
         WHERE stock_symbol = w.stock_symbol
         ORDER BY time DESC LIMIT 1
       ) md ON true
       WHERE w.user_id = $1
       ORDER BY w.added_at DESC`,
      [user_id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching watchlist', error: error.message });
  }
};

// ─────────────────────────────────────────
// DELETE /api/watchlist/remove
// Remove stock from watchlist
// ─────────────────────────────────────────
const removeFromWatchlist = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { stock_symbol } = req.body;

    if (!stock_symbol) {
      return res.status(400).json({ success: false, message: 'stock_symbol required' });
    }

    const result = await query(
      'DELETE FROM watchlist WHERE user_id = $1 AND stock_symbol = $2 RETURNING *',
      [user_id, stock_symbol.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stock not in watchlist' });
    }

    res.json({ success: true, message: `${stock_symbol} removed from watchlist` });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from watchlist', error: error.message });
  }
};

module.exports = { addToWatchlist, getWatchlist, removeFromWatchlist };
