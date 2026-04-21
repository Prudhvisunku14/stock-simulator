// controllers/notificationController.js

const { query } = require('../config/db');

// GET /api/notifications/:user_id
const getNotifications = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { unread_only = false, limit = 50 } = req.query;

    let sql = `SELECT * FROM notifications WHERE user_id = $1`;
    const params = [user_id];

    if (unread_only === 'true') {
      sql += ` AND is_read = false`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $2`;
    params.push(parseInt(limit));

    const result = await query(sql, params);

    // Count unread
    const unreadCount = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [user_id]
    );

    res.json({
      success: true,
      unread_count: parseInt(unreadCount.rows[0].count),
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
  }
};

// PUT /api/notifications/mark-read
const markAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { notification_id } = req.body;

    if (notification_id) {
      // Mark specific notification
      await query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
        [notification_id, user_id]
      );
    } else {
      // Mark all as read
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1',
        [user_id]
      );
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating notification', error: error.message });
  }
};

module.exports = { getNotifications, markAsRead };
