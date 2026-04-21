// controllers/alertController.js
// BUG FIX: was querying `alerts` table which doesn't exist — now uses `notifications`

const { query } = require('../config/db');

// GET /api/alerts — fetch user's alerts (from notifications table, type='alert')
const getAlerts = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(`
            SELECT 
                id,
                user_id,
                title,
                message,
                type AS alert_type,
                stock_symbol,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId]);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error fetching alerts:', err);
        res.status(500).json({ success: false, message: 'Error fetching alerts', error: err.message });
    }
};

// PUT /api/alerts/:id/read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(`
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }

        res.json({ success: true, message: 'Alert marked as read' });
    } catch (err) {
        console.error('Error marking alert as read:', err);
        res.status(500).json({ success: false, message: 'Error updating alert', error: err.message });
    }
};

// DELETE /api/alerts/:id
const deleteAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(`
            DELETE FROM notifications
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }

        res.json({ success: true, message: 'Alert deleted successfully' });
    } catch (err) {
        console.error('Error deleting alert:', err);
        res.status(500).json({ success: false, message: 'Error deleting alert', error: err.message });
    }
};

module.exports = { getAlerts, markAsRead, deleteAlert };
