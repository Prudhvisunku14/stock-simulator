// controllers/tradeController.js
// Paper trading - place and close virtual trades

const { query } = require('../config/db');

// ─────────────────────────────────────────
// POST /api/trades/place
// Place a paper trade (buy/sell)
// Body: { stock_symbol, trade_type, quantity, stop_loss, target_price, ml_pattern_id }
// ─────────────────────────────────────────
const placeTrade = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { stock_symbol, trade_type, quantity, stop_loss, target_price, ml_pattern_id } = req.body;

    // Validate required fields
    if (!stock_symbol || !trade_type || !quantity) {
      return res.status(400).json({ success: false, message: 'stock_symbol, trade_type, quantity are required' });
    }

    if (!['BUY', 'SELL'].includes(trade_type.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'trade_type must be BUY or SELL' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be positive' });
    }

    // Get latest price from market_data
    const priceResult = await query(
      `SELECT close_price FROM market_data
       WHERE stock_symbol = $1
       ORDER BY time DESC LIMIT 1`,
      [stock_symbol.toUpperCase()]
    );

    if (priceResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No market data found for this stock' });
    }

    const entry_price = parseFloat(priceResult.rows[0].close_price);
    const total_cost  = entry_price * quantity;

    // Check user has enough balance (for BUY)
    const userResult = await query('SELECT balance FROM users WHERE id = $1', [user_id]);
    const user_balance = parseFloat(userResult.rows[0].balance);

    if (trade_type.toUpperCase() === 'BUY' && user_balance < total_cost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Need ₹${total_cost.toFixed(2)}, have ₹${user_balance.toFixed(2)}`
      });
    }

    // Insert trade
    const tradeResult = await query(
      `INSERT INTO trades 
        (user_id, stock_symbol, trade_type, quantity, entry_price, stop_loss, target_price, status, ml_pattern_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', $8)
       RETURNING *`,
      [
        user_id,
        stock_symbol.toUpperCase(),
        trade_type.toUpperCase(),
        quantity,
        entry_price,
        stop_loss || null,
        target_price || null,
        ml_pattern_id || null
      ]
    );

    // Deduct balance for BUY
    if (trade_type.toUpperCase() === 'BUY') {
      await query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [total_cost, user_id]
      );
    }

    // Create notification
    await query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [
        user_id,
        `Trade Placed: ${trade_type} ${stock_symbol}`,
        `${trade_type} ${quantity} shares of ${stock_symbol} at ₹${entry_price}`,
        'trade'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Trade placed successfully',
      data: tradeResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Trade Placement Error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Error placing trade', error: error.message });
  }
};

// ─────────────────────────────────────────
// POST /api/trades/close
// Close an open trade and calculate P&L
// Body: { trade_id }
// ─────────────────────────────────────────
const closeTrade = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { trade_id } = req.body;

    if (!trade_id) {
      return res.status(400).json({ success: false, message: 'trade_id is required' });
    }

    // Get the open trade
    const tradeResult = await query(
      `SELECT * FROM trades WHERE id = $1 AND user_id = $2 AND status = 'OPEN'`,
      [trade_id, user_id]
    );

    if (tradeResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Open trade not found' });
    }

    const trade = tradeResult.rows[0];

    // Get current price (exit price)
    const priceResult = await query(
      `SELECT close_price FROM market_data
       WHERE stock_symbol = $1 ORDER BY time DESC LIMIT 1`,
      [trade.stock_symbol]
    );

    const exit_price = parseFloat(priceResult.rows[0]?.close_price || trade.entry_price);
    const entry_price = parseFloat(trade.entry_price);
    const quantity    = trade.quantity;

    // Calculate P&L
    let pnl = 0;
    if (trade.trade_type === 'BUY') {
      pnl = (exit_price - entry_price) * quantity;
    } else {
      pnl = (entry_price - exit_price) * quantity;
    }
    const pnl_percent = ((pnl / (entry_price * quantity)) * 100);

    // Close the trade
    await query(
      `UPDATE trades SET status = 'CLOSED', closed_at = NOW() WHERE id = $1`,
      [trade_id]
    );

    // Insert into trade_history
    await query(
      `INSERT INTO trade_history 
        (trade_id, user_id, stock_symbol, trade_type, quantity, entry_price, exit_price, pnl, pnl_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [trade_id, user_id, trade.stock_symbol, trade.trade_type, quantity, entry_price, exit_price, pnl, pnl_percent]
    );

    // Credit back: initial investment + P&L to balance
    const credit = (exit_price * quantity);
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [credit, user_id]);

    res.json({
      success: true,
      message: 'Trade closed',
      data: {
        trade_id,
        stock_symbol: trade.stock_symbol,
        trade_type: trade.trade_type,
        quantity,
        entry_price,
        exit_price,
        pnl: parseFloat(pnl.toFixed(2)),
        pnl_percent: parseFloat(pnl_percent.toFixed(2))
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error closing trade', error: error.message });
  }
};

// ─────────────────────────────────────────
// GET /api/portfolio/:user_id
// Get open trades + history + summary
// ─────────────────────────────────────────
const getPortfolio = async (req, res) => {
  try {
    const user_id = req.user.id;

    // Get user balance
    const userResult = await query('SELECT balance, name, mobile_number FROM users WHERE id = $1', [user_id]);
    const user = userResult.rows[0];

    // Get open trades
    const openTrades = await query(
      `SELECT t.*, md.close_price as current_price,
        CASE 
          WHEN t.trade_type = 'BUY' THEN (md.close_price - t.entry_price) * t.quantity
          ELSE (t.entry_price - md.close_price) * t.quantity
        END as unrealized_pnl
       FROM trades t
       LEFT JOIN LATERAL (
         SELECT close_price FROM market_data
         WHERE stock_symbol = t.stock_symbol ORDER BY time DESC LIMIT 1
       ) md ON true
       WHERE t.user_id = $1 AND t.status = 'OPEN'
       ORDER BY t.placed_at DESC`,
      [user_id]
    );

    // Get trade history (last 30)
    const history = await query(
      `SELECT * FROM trade_history WHERE user_id = $1 ORDER BY closed_at DESC LIMIT 30`,
      [user_id]
    );

    // Calculate total realized P&L
    const totalPnlResult = await query(
      'SELECT COALESCE(SUM(pnl), 0) as total_pnl FROM trade_history WHERE user_id = $1',
      [user_id]
    );

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          mobile: user.mobile_number,
          balance: parseFloat(user.balance)
        },
        open_trades: openTrades.rows,
        trade_history: history.rows,
        summary: {
          total_realized_pnl: parseFloat(totalPnlResult.rows[0].total_pnl),
          total_unrealized_pnl: openTrades.rows.reduce((sum, trade) => sum + parseFloat(trade.unrealized_pnl || 0), 0),
          open_positions: openTrades.rows.length
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching portfolio', error: error.message });
  }
};

module.exports = { placeTrade, closeTrade, getPortfolio };
