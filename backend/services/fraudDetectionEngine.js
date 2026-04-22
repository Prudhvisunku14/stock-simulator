// services/fraudDetectionEngine.js
const { query } = require('../config/db');

/**
 * Fraud Detection Engine
 * Analyzes user behavior and trading patterns to detect outliers.
 */
const start = () => {
    console.log('🛡️ Fraud Detection Engine started (interval: 5 min)');
    
    // Run immediately
    runDetection().catch(err => console.error('Initial fraud scan error:', err));
    
    // Periodic scan every 5 minutes
    setInterval(async () => {
        try {
            await runDetection();
        } catch (err) {
            console.error('❌ Fraud Detection Engine error:', err.message);
        }
    }, 5 * 60 * 1000);
};

const runDetection = async () => {
    console.log('\n🔍 Running Fraud & Outlier Detection...');
    
    // 1. Get Profit Stats for Z-score calculation
    const statsRes = await query(`
        SELECT 
            AVG(total_pnl)::float AS mean_profit,
            STDDEV(total_pnl)::float AS std_dev
        FROM (
            SELECT user_id, SUM(pnl) AS total_pnl 
            FROM trade_history 
            GROUP BY user_id
        ) user_profits
    `);
    
    const { mean_profit, std_dev } = statsRes.rows[0];
    const safeStdDev = std_dev || 1; // Avoid division by zero

    // 2. Get User Activity Metrics
    const usersRes = await query(`
        SELECT 
            u.id, 
            u.email,
            COALESCE(SUM(th.pnl), 0)::float AS total_profit,
            COUNT(th.id)::int AS total_trades,
            COUNT(th.id) FILTER (WHERE th.pnl > 0)::int AS wins,
            (
                SELECT COUNT(*)::int 
                FROM trades t 
                WHERE t.user_id = u.id 
                  AND t.placed_at > NOW() - INTERVAL '10 minutes'
            ) AS trades_last_10m,
            (
                SELECT SUM(pnl)::float 
                FROM trade_history 
                WHERE user_id = u.id 
                  AND closed_at > NOW() - INTERVAL '1 day'
            ) AS profit_last_24h,
            u.balance
        FROM users u
        LEFT JOIN trade_history th ON u.id = th.user_id
        WHERE u.role = 'USER'
        GROUP BY u.id, u.email, u.balance
    `);

    for (const user of usersRes.rows) {
        let riskScore = 0;
        const flags = [];

        // --- Z-Score (40%) ---
        const zScore = (user.total_profit - mean_profit) / safeStdDev;
        if (zScore > 2.5) {
            riskScore += 40;
            flags.push('Profit anomaly (Z-score: ' + zScore.toFixed(2) + ')');
        }

        // --- Win Rate (20%) ---
        const winRate = user.total_trades > 20 ? (user.wins / user.total_trades) * 100 : 0;
        if (winRate > 90) {
            riskScore += 20;
            flags.push('Unusual win rate (' + winRate.toFixed(1) + '%)');
        }

        // --- Trade Frequency (20%) ---
        if (user.trades_last_10m > 50) {
            riskScore += 20;
            flags.push('High frequency trading (' + user.trades_last_10m + ' trades in 10m)');
        }

        // --- Profit Spike (20%) ---
        // Flag if profit in 24h is > 50% of their balance
        const profitSpikePercent = user.balance > 0 ? (user.profit_last_24h / user.balance) * 100 : 0;
        if (profitSpikePercent > 50) {
            riskScore += 20;
            flags.push('Massive profit spike (' + profitSpikePercent.toFixed(1) + '% of balance in 24h)');
        }

        // --- Bot Detection (Bonus Flag) ---
        // Check for identical trades (quantity + stock + type) repeated > 5 times in short window
        const botCheck = await query(`
            SELECT stock_symbol, quantity, trade_type, COUNT(*) as count
            FROM trades
            WHERE user_id = $1 AND placed_at > NOW() - INTERVAL '30 minutes'
            GROUP BY stock_symbol, quantity, trade_type
            HAVING COUNT(*) > 5
        `, [user.id]);

        if (botCheck.rows.length > 0) {
            riskScore = Math.min(100, riskScore + 30);
            flags.push('Potential bot behavior (Identical repeated orders)');
        }

        // 3. Update or Insert into suspicious_users if riskScore > 30
        if (riskScore > 30) {
            await query(`
                INSERT INTO suspicious_users (user_id, risk_score, flags, status)
                VALUES ($1, $2, $3, 'ACTIVE')
                ON CONFLICT (user_id) DO UPDATE SET
                    risk_score = EXCLUDED.risk_score,
                    flags = EXCLUDED.flags,
                    created_at = NOW()
                WHERE suspicious_users.status = 'ACTIVE'
            `, [user.id, riskScore, flags]);
            
            console.log(`🚩 USER FLAGGED: ${user.email} | Score: ${riskScore} | Flags: ${flags.length}`);
        }
    }

    console.log('✅ Fraud detection scan complete\n');
};

module.exports = { start, runDetection };
