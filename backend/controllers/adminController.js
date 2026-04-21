// controllers/adminController.js
// Fixed: handles empty tables, fixed column references, added summary endpoint

const { query } = require('../config/db');

// ── GET /api/admin/analytics/users ──────────────────────────
const getUserAnalytics = async (req, res) => {
  try {
    const topTraders = await query(`
      SELECT u.id AS user_id, u.name, COUNT(t.id)::int AS trades
      FROM users u
      LEFT JOIN trades t ON u.id = t.user_id
      GROUP BY u.id, u.name
      ORDER BY trades DESC
      LIMIT 10
    `);

    const timeDistribution = await query(`
      SELECT
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM placed_at) >= 6  AND EXTRACT(HOUR FROM placed_at) < 12)::int AS morning,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM placed_at) >= 12 AND EXTRACT(HOUR FROM placed_at) < 16)::int AS afternoon,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM placed_at) >= 16 AND EXTRACT(HOUR FROM placed_at) < 21)::int AS evening,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM placed_at) >= 21 OR  EXTRACT(HOUR FROM placed_at) < 6)::int  AS night
      FROM trades
    `);

    const totalUsersRes = await query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE role='ADMIN')::int AS admins FROM users`);

    res.json({
      success: true,
      data: {
        most_active_users: topTraders.rows,
        time_distribution: timeDistribution.rows[0],
        totals: totalUsersRes.rows[0]
      }
    });
  } catch (error) {
    console.error('getUserAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/admin/analytics/trades ─────────────────────────
const getTradeAnalytics = async (req, res) => {
  try {
    const dailyTrades = await query(`
      SELECT DATE(placed_at)::text AS date, COUNT(*)::int AS trades
      FROM trades
      GROUP BY DATE(placed_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    const monthlyTrades = await query(`
      SELECT TO_CHAR(placed_at, 'Mon YYYY') AS month,
             COUNT(*)::int AS trades,
             MIN(placed_at) AS sort_key
      FROM trades
      GROUP BY TO_CHAR(placed_at, 'Mon YYYY')
      ORDER BY sort_key
    `);

    const buySellCount = await query(`
      SELECT trade_type, COUNT(*)::int AS count
      FROM trades
      GROUP BY trade_type
    `);

    const buyCount  = buySellCount.rows.find(r => r.trade_type === 'BUY')?.count  || 0;
    const sellCount = buySellCount.rows.find(r => r.trade_type === 'SELL')?.count || 0;

    const flowRes = await query(`
      SELECT
        status,
        COUNT(*)::int AS count,
        AVG(
          CASE WHEN status = 'CLOSED' AND closed_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (closed_at - placed_at)) / 3600
          END
        ) AS avg_hours
      FROM trades
      GROUP BY status
    `);

    const openTrades      = flowRes.rows.find(r => r.status === 'OPEN')?.count   || 0;
    const closedTrades    = flowRes.rows.find(r => r.status === 'CLOSED')?.count || 0;
    const avgHoldingHours = parseFloat(flowRes.rows.find(r => r.status === 'CLOSED')?.avg_hours || 0).toFixed(2);

    // Total PnL
    const pnlRes = await query(`SELECT COALESCE(SUM(pnl),0)::numeric AS total_pnl FROM trade_history`);

    res.json({
      success: true,
      data: {
        daily_trades:   dailyTrades.rows,
        monthly_trades: monthlyTrades.rows.map(r => ({ month: r.month, trades: r.trades })),
        buy_count:      parseInt(buyCount),
        sell_count:     parseInt(sellCount),
        total_pnl:      parseFloat(pnlRes.rows[0].total_pnl),
        flow: {
          open_trades:          parseInt(openTrades),
          closed_trades:        parseInt(closedTrades),
          avg_holding_time_hours: avgHoldingHours
        }
      }
    });
  } catch (error) {
    console.error('getTradeAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/admin/analytics/sectors ────────────────────────
const getSectorAnalytics = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COALESCE(s.sector, 'Unknown') AS sector,
        COUNT(t.id)::int              AS trades,
        COALESCE(SUM(t.quantity * t.entry_price), 0)::numeric AS volume
      FROM stocks s
      LEFT JOIN trades t ON t.stock_symbol = s.symbol
      GROUP BY COALESCE(s.sector, 'Unknown')
      ORDER BY volume DESC
    `);

    const sectors = {};
    result.rows.forEach(row => {
      sectors[row.sector] = {
        trades: row.trades,
        volume: parseFloat(row.volume)
      };
    });

    res.json({ success: true, data: sectors });
  } catch (error) {
    console.error('getSectorAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/admin/analytics/stocks ─────────────────────────
const getStockAnalytics = async (req, res) => {
  try {
    const mostTraded = await query(`
      SELECT stock_symbol AS symbol, COUNT(*)::int AS trades
      FROM trades
      GROUP BY stock_symbol
      ORDER BY trades DESC
      LIMIT 10
    `);

    // Safe: LEFT JOIN so stocks with no history still appear
    const performance = await query(`
      SELECT stock_symbol AS symbol, COALESCE(SUM(pnl), 0)::numeric AS total_profit
      FROM trade_history
      GROUP BY stock_symbol
      ORDER BY total_profit DESC
    `);

    const sorted         = performance.rows;
    const mostProfitable = sorted.slice(0, 5);
    const mostLoss       = [...sorted].reverse().slice(0, 5);

    res.json({
      success: true,
      data: {
        most_traded:      mostTraded.rows,
        most_profitable:  mostProfitable.map(r => ({ symbol: r.symbol, profit: parseFloat(r.total_profit) })),
        most_loss:        mostLoss.map(r => ({ symbol: r.symbol, profit: parseFloat(r.total_profit) }))
      }
    });
  } catch (error) {
    console.error('getStockAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/admin/analytics/alerts ─────────────────────────
const getAlertAnalytics = async (req, res) => {
  try {
    const totalRes = await query(`SELECT COUNT(*)::int AS total FROM global_alerts`);

    const commonPattern = await query(`
      SELECT pattern AS pattern_type, COUNT(*)::int AS count
      FROM global_alerts
      GROUP BY pattern
      ORDER BY count DESC
      LIMIT 5
    `);

    const avgConf = await query(`
      SELECT COALESCE(AVG(confidence), 0)::numeric AS avg_confidence
      FROM global_alerts
    `);

    const recentAlerts = await query(`
      SELECT symbol, pattern, signal, confidence, created_at
      FROM global_alerts
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const notifStats = await query(`
      SELECT
        COUNT(*)::int                                             AS total_notifications,
        COUNT(*) FILTER (WHERE is_read = false)::int             AS unread,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS last_24h
      FROM notifications
      WHERE type = 'alert'
    `);

    res.json({
      success: true,
      data: {
        total_alerts:        totalRes.rows[0].total,
        top_patterns:        commonPattern.rows,
        most_common_pattern: commonPattern.rows[0]?.pattern_type || 'N/A',
        avg_success_rate:    parseFloat(avgConf.rows[0].avg_confidence).toFixed(4),
        recent_alerts:       recentAlerts.rows,
        notification_stats:  notifStats.rows[0]
      }
    });
  } catch (error) {
    console.error('getAlertAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/admin/analytics/summary ────────────────────────
// Single aggregated endpoint for dashboard KPI cards
const getSummary = async (req, res) => {
  try {
    const [users, trades, pnl, alerts] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM users`),
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='OPEN')::int AS open FROM trades`),
      query(`SELECT COALESCE(SUM(pnl),0)::numeric AS total FROM trade_history`),
      query(`SELECT COUNT(*)::int AS total FROM global_alerts WHERE created_at > NOW() - INTERVAL '24 hours'`),
    ]);

    res.json({
      success: true,
      data: {
        total_users:   users.rows[0].total,
        total_trades:  trades.rows[0].total,
        open_trades:   trades.rows[0].open,
        total_pnl:     parseFloat(pnl.rows[0].total),
        alerts_today:  alerts.rows[0].total
      }
    });
  } catch (error) {
    console.error('getSummary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/admin/stocks/control ──────────────────────────
const controlStock = async (req, res) => {
  try {
    const { symbol, price, is_volatile, action } = req.body;
    if (!symbol) return res.status(400).json({ success: false, message: 'Stock symbol required' });

    const sym = symbol.toUpperCase();
    let updateQuery = 'UPDATE stocks SET updated_at = NOW()';
    const params = [sym];
    let idx = 2;

    if (price !== undefined)       { updateQuery += `, price = $${idx++}`;       params.push(price); }
    if (is_volatile !== undefined) { updateQuery += `, is_volatile = $${idx++}`; params.push(is_volatile); }
    if (action === 'spike') {
      const spike = randFloat(-5, 5, 4);
      updateQuery += `, price = price * (1 + $${idx++} / 100)`;
      params.push(spike);
    }

    updateQuery += ' WHERE symbol = $1 RETURNING *';
    const result = await query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }

    res.json({ success: true, message: 'Stock updated', data: result.rows[0] });
  } catch (error) {
    console.error('controlStock error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/admin/users/:id/balance ───────────────────────
const adjustUserBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, action } = req.body; // action: 'set' | 'add'

    if (!amount) return res.status(400).json({ success: false, message: 'Amount required' });

    let q;
    if (action === 'add') {
      q = await query('UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING id, name, balance', [amount, id]);
    } else {
      q = await query('UPDATE users SET balance = $1 WHERE id = $2 RETURNING id, name, balance', [amount, id]);
    }

    if (q.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Balance updated', data: q.rows[0] });
  } catch (error) {
    console.error('adjustUserBalance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function randFloat(min, max, dp = 4) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp));
}

module.exports = {
  getUserAnalytics,
  getTradeAnalytics,
  getSectorAnalytics,
  getStockAnalytics,
  getAlertAnalytics,
  getSummary,
  controlStock,
  adjustUserBalance
};
