-- ============================================================
-- MIGRATION: Complete Fix for Stock Simulator
-- Run this on your existing DB to add all missing columns/tables
-- ============================================================

-- 1. Add 'role' column to users (missing from original schema)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'));

-- 2. Add 'receive_global_alerts' column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS receive_global_alerts BOOLEAN DEFAULT FALSE;

-- 3. Add 'is_volatile' and 'updated_at' to stocks if missing
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS is_volatile BOOLEAN DEFAULT FALSE;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Ensure notifications table has correct columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS stock_symbol VARCHAR(20);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS alert_type VARCHAR(50) DEFAULT 'info';

-- 5. Create global_alerts table (used by alertEngine)
CREATE TABLE IF NOT EXISTS global_alerts (
    id          SERIAL PRIMARY KEY,
    symbol      VARCHAR(20) NOT NULL,
    pattern     VARCHAR(100) NOT NULL,
    signal      VARCHAR(10),
    confidence  NUMERIC(5,4),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_alerts_symbol_time ON global_alerts(symbol, created_at);
CREATE INDEX IF NOT EXISTS idx_global_alerts_pattern ON global_alerts(symbol, pattern, created_at);

-- 6. Create alerts table as a VIEW over notifications for backward compat
-- Actually, fix alertController to use notifications table (done in code)
-- Create a proper alerts table alias view
CREATE OR REPLACE VIEW alerts AS
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
    WHERE type = 'alert';

-- 7. Add closed_at to trades if missing
ALTER TABLE trades ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'OPEN';

-- 8. Ensure trade_history table exists  
CREATE TABLE IF NOT EXISTS trade_history (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stock_symbol VARCHAR(20),
    trade_type   VARCHAR(10),
    quantity     INTEGER,
    entry_price  NUMERIC(12,2),
    exit_price   NUMERIC(12,2),
    pnl          NUMERIC(12,2),
    closed_at    TIMESTAMP DEFAULT NOW()
);

-- 9. user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action      VARCHAR(100),
    ip_address  VARCHAR(50),
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, action, ip_address)
);

-- Confirm
SELECT 'Migration complete' AS status;
