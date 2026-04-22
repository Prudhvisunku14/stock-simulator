// controllers/fraudController.js
const { query } = require('../config/db');

// GET /api/admin/fraud/users
const getSuspiciousUsers = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        su.id, su.risk_score, su.flags, su.status, su.created_at,
        u.email, u.name, u.is_disabled, u.balance
      FROM suspicious_users su
      JOIN users u ON su.user_id = u.id
      ORDER BY su.risk_score DESC
    `);
    
    // Top suspicious stats
    const stats = await query(`
      SELECT 
        COUNT(*)::int as total_flagged,
        AVG(risk_score)::float as avg_risk
      FROM suspicious_users
      WHERE status = 'ACTIVE'
    `);

    res.json({
      success: true,
      data: result.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('getSuspiciousUsers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/fraud/warn
const sendWarning = async (req, res) => {
  try {
    const { user_id, message } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'User ID required' });

    const msg = message || 'Your account has been flagged for unusual trading activity. Please contact support.';
    
    await query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, '⚠️ Account Security Warning', $2, 'alert')
    `, [user_id, msg]);

    res.json({ success: true, message: 'Warning notification sent' });
  } catch (error) {
    console.error('sendWarning error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/fraud/disable
const disableUser = async (req, res) => {
  try {
    const { user_id, disable } = req.body; // disable: boolean
    if (!user_id) return res.status(400).json({ success: false, message: 'User ID required' });

    await query(`
      UPDATE users SET is_disabled = $1 WHERE id = $2
    `, [disable !== false, user_id]);

    res.json({ 
        success: true, 
        message: disable === false ? 'User re-enabled' : 'User disabled successfully' 
    });
  } catch (error) {
    console.error('disableUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSuspiciousUsers, sendWarning, disableUser };
