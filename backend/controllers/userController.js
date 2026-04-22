// controllers/userController.js
const { query } = require('../config/db');

// GET /api/user/settings
const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT receive_global_alerts FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Return precisely what user asked for: { "receive_global_alerts": true }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/user/settings
const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from JWT by auth middleware
    const { receive_global_alerts } = req.body;
    
    if (typeof receive_global_alerts === 'undefined') {
      return res.status(400).json({ success: false, message: 'receive_global_alerts is required' });
    }
    
    const result = await query(
      'UPDATE users SET receive_global_alerts = $1 WHERE id = $2 RETURNING receive_global_alerts',
      [receive_global_alerts, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Return updated value
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUserSettings, updateUserSettings };
