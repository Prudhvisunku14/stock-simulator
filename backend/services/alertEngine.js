// services/alertEngine.js
// Global alert engine: scans stocks, calls ML API, distributes notifications

const { query } = require('../config/db');
const socketService = require('./socketService');
const mlService = require('./mlService');

const SCAN_INTERVAL_MS = 30 * 1000;       // 30 seconds
const DUPLICATE_WINDOW_MINS = 30;
const CONFIDENCE_THRESHOLD = 0.5;         // TEMPORARILY LOWERED for testing (was 0.7)
const RATE_LIMIT_PER_MIN = 5;
const BATCH_SIZE = 5;

// In-memory rate limit cache: userId -> [timestamps]
const userAlertHistory = new Map();

// ─────────────────────────────────────────────
// PUBLIC: start the engine
// ─────────────────────────────────────────────
const start = () => {
    console.log('🚀 Global Alert Engine started (confidence threshold:', CONFIDENCE_THRESHOLD, ')');

    // Initial scan immediately
    runGlobalScan().catch(err => console.error('Initial scan error:', err));

    // Periodic scan
    setInterval(async () => {
        try {
            await runGlobalScan();
        } catch (err) {
            console.error('❌ Alert Engine scan error:', err.message);
        }
    }, SCAN_INTERVAL_MS);

    // Rate limit cache cleanup every 5 min
    setInterval(() => {
        const now = Date.now();
        for (const [userId, timestamps] of userAlertHistory.entries()) {
            const valid = timestamps.filter(t => now - t < 60000);
            if (valid.length === 0) userAlertHistory.delete(userId);
            else userAlertHistory.set(userId, valid);
        }
    }, 5 * 60 * 1000);
};

// ─────────────────────────────────────────────
// STEP 1: Determine which stocks to scan
// ─────────────────────────────────────────────
const runGlobalScan = async () => {
    console.log('\n🔍 Running Global Market Scan...');

    // Get all active stocks (watchlisted ones get priority)
    const stocksResult = await query(`
        SELECT DISTINCT s.symbol
        FROM stocks s
        WHERE s.is_active = true
        ORDER BY s.symbol
        LIMIT 100
    `);

    const stocks = stocksResult.rows;
    console.log(`📊 Scanning ${stocks.length} stocks in batches of ${BATCH_SIZE}...`);

    // Scan in batches to avoid ML service overload
    for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
        const batch = stocks.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(stock => scanStock(stock.symbol).catch(err => {
            console.error(`Error scanning ${stock.symbol}:`, err.message);
        })));

        // Small delay between batches
        if (i + BATCH_SIZE < stocks.length) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log('✅ Global scan complete\n');
};

// ─────────────────────────────────────────────
// STEP 2: Scan individual stock
// ─────────────────────────────────────────────
const scanStock = async (symbol) => {
    const result = await mlService.detectPattern(symbol);

    if (!result.success) return;

    const confidence = result.probability;
    console.log(`  [${symbol}] Pattern: ${result.pattern_type} | Signal: ${result.signal} | Confidence: ${(confidence * 100).toFixed(0)}%`);

    if (confidence >= CONFIDENCE_THRESHOLD) {
        await processDetectedPattern(symbol, result);
    }
};

// ─────────────────────────────────────────────
// STEP 3: Avoid duplicates, store in global_alerts
// ─────────────────────────────────────────────
const processDetectedPattern = async (symbol, data) => {
    try {
        // Duplicate check: same symbol + pattern within 30 mins
        const dupCheck = await query(`
            SELECT id FROM global_alerts
            WHERE symbol = $1
              AND pattern = $2
              AND created_at > NOW() - INTERVAL '${DUPLICATE_WINDOW_MINS} minutes'
            LIMIT 1
        `, [symbol, data.pattern_type]);

        if (dupCheck.rows.length > 0) {
            return; // Skip duplicate
        }

        // Insert into global_alerts
        const alertResult = await query(`
            INSERT INTO global_alerts (symbol, pattern, signal, confidence)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [symbol, data.pattern_type, data.signal, data.probability]);

        const globalAlert = alertResult.rows[0];
        console.log(`✨ NEW GLOBAL ALERT: ${symbol} → ${data.pattern_type} (${data.signal}) [${(data.probability * 100).toFixed(0)}%]`);

        // Distribute to relevant users
        await distributeToUsers(symbol, globalAlert, data.is_mock || false);

    } catch (err) {
        console.error(`Error processing pattern for ${symbol}:`, err.message);
    }
};

// ─────────────────────────────────────────────
// STEP 4: Distribute to users (watchlist OR global alerts opt-in)
// ─────────────────────────────────────────────
const distributeToUsers = async (symbol, alert, isMock) => {
    try {
        const users = await query(`
            SELECT u.id
            FROM users u
            WHERE u.is_active = true
              AND (
                  u.receive_global_alerts = true
                  OR u.id IN (
                      SELECT user_id FROM watchlist WHERE stock_symbol = $1
                  )
              )
        `, [symbol]);

        if (users.rows.length === 0) return;

        const prefix = isMock ? '[DEMO] ' : '';
        const title = `${prefix}Pattern Alert: ${symbol}`;
        const message = `${alert.pattern} | Signal: ${alert.signal} | Confidence: ${(alert.confidence * 100).toFixed(0)}%`;

        for (const user of users.rows) {
            // Rate limit check
            if (isRateLimited(user.id)) {
                console.log(`  Rate limited: user ${user.id}`);
                continue;
            }

            // Notification-level duplicate check (per user)
            const notifDup = await query(`
                SELECT id FROM notifications
                WHERE user_id = $1
                  AND stock_symbol = $2
                  AND message LIKE $3
                  AND created_at > NOW() - INTERVAL '${DUPLICATE_WINDOW_MINS} minutes'
                LIMIT 1
            `, [user.id, symbol, `%${alert.pattern}%`]);

            if (notifDup.rows.length > 0) continue;

            // Insert into notifications table
            await query(`
                INSERT INTO notifications (user_id, title, message, type, stock_symbol, is_read)
                VALUES ($1, $2, $3, 'alert', $4, false)
            `, [user.id, title, message, symbol]);

            // Real-time push via WebSocket
            socketService.sendToUser(user.id, 'NEW_ALERT', {
                id: alert.id,
                title,
                message,
                stock_symbol: symbol,
                alert_type: 'pattern',
                pattern: alert.pattern,
                signal: alert.signal,
                confidence: alert.confidence,
                is_mock: isMock,
                created_at: new Date().toISOString(),
                is_read: false
            });
        }

        console.log(`  📬 Notified ${users.rows.length} user(s) about ${symbol}`);
    } catch (err) {
        console.error('Error distributing alerts:', err.message);
    }
};

// ─────────────────────────────────────────────
// Rate limiter: max RATE_LIMIT_PER_MIN per user per minute
// ─────────────────────────────────────────────
const isRateLimited = (userId) => {
    const now = Date.now();
    const history = userAlertHistory.get(userId) || [];
    const recent = history.filter(t => now - t < 60000);

    if (recent.length >= RATE_LIMIT_PER_MIN) return true;

    recent.push(now);
    userAlertHistory.set(userId, recent);
    return false;
};

module.exports = { start, runGlobalScan };
