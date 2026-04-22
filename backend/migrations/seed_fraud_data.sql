-- backend/migrations/seed_fraud_data.sql

-- 1. CLEANUP PREVIOUS MOCK DATA (Optional but recommended for consistency)
DELETE FROM suspicious_users;
DELETE FROM trade_history WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@stocksim.dev');
DELETE FROM trades WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@stocksim.dev');
DELETE FROM users WHERE email LIKE '%@stocksim.dev' AND role != 'ADMIN';

-- 2. INSERT USERS
INSERT INTO users (name, email, mobile_number, password, balance, role, is_active)
VALUES 
('Profit Whale', 'fraud_high@stocksim.dev', '9900000001', '$2b$10$7R6J5U6zN5W9Q9R9Q9R9QeXk5C5C5C5C5C5C5C5C5C5C5C5C5', 800000, 'USER', true),
('Algo Bot', 'fraud_bot@stocksim.dev', '9900000002', '$2b$10$7R6J5U6zN5W9Q9R9Q9R9QeXk5C5C5C5C5C5C5C5C5C5C5C5C5', 600000, 'USER', true),
('John Doe', 'normal_user@stocksim.dev', '9900000003', '$2b$10$7R6J5U6zN5W9Q9R9Q9R9QeXk5C5C5C5C5C5C5C5C5C5C5C5C5', 100000, 'USER', true)
ON CONFLICT (email) DO NOTHING;

-- 3. INSERT TRADES & HISTORY
DO $$
DECLARE
    u_high_id INT;
    u_bot_id INT;
    u_norm_id INT;
BEGIN
    SELECT id INTO u_high_id FROM users WHERE email = 'fraud_high@stocksim.dev';
    SELECT id INTO u_bot_id FROM users WHERE email = 'fraud_bot@stocksim.dev';
    SELECT id INTO u_norm_id FROM users WHERE email = 'normal_user@stocksim.dev';

    -- ────────────────────────────────────────────────────────
    -- HIGH PROFIT USER (30+ profitable trades)
    -- ────────────────────────────────────────────────────────
    IF u_high_id IS NOT NULL THEN
        FOR i IN 1..35 LOOP
            -- Create a closed trade with huge PnL
            INSERT INTO trade_history (user_id, stock_symbol, trade_type, quantity, entry_price, exit_price, pnl, pnl_percent, closed_at)
            VALUES (
                u_high_id, 
                CASE WHEN i % 2 = 0 THEN 'RELIANCE' ELSE 'TCS' END,
                'BUY', 
                100, 
                2500, 
                2600 + (i * 2), 
                10000 + (i * 500), -- Escalating profit
                5.0, 
                NOW() - (i || ' hours')::interval
            );
        END LOOP;
    END IF;

    -- ────────────────────────────────────────────────────────
    -- BOT USER (50+ repeated identical trades within minutes)
    -- ────────────────────────────────────────────────────────
    IF u_bot_id IS NOT NULL THEN
        FOR i IN 1..55 LOOP
            -- Identical trades: INFY, 10 qty, BUY
            INSERT INTO trades (user_id, stock_symbol, trade_type, quantity, entry_price, status, placed_at)
            VALUES (u_bot_id, 'INFY', 'BUY', 10, 1500, 'CLOSED', NOW() - (i * 10 || ' seconds')::interval);
            
            INSERT INTO trade_history (user_id, stock_symbol, trade_type, quantity, entry_price, exit_price, pnl, pnl_percent, closed_at)
            VALUES (u_bot_id, 'INFY', 'BUY', 10, 1500, 1520, 200, 1.33, NOW() - (i * 10 || ' seconds')::interval);
        END LOOP;
    END IF;

    -- ────────────────────────────────────────────────────────
    -- NORMAL USER (Balanced mix)
    -- ────────────────────────────────────────────────────────
    IF u_norm_id IS NOT NULL THEN
        -- Win
        INSERT INTO trade_history (user_id, stock_symbol, trade_type, quantity, entry_price, exit_price, pnl, pnl_percent, closed_at)
        VALUES (u_norm_id, 'HDFCBANK', 'BUY', 5, 1600, 1650, 250, 3.12, NOW() - INTERVAL '2 hours');
        -- Loss
        INSERT INTO trade_history (user_id, stock_symbol, trade_type, quantity, entry_price, exit_price, pnl, pnl_percent, closed_at)
        VALUES (u_norm_id, 'SBIN', 'SELL', 20, 780, 800, -400, -2.56, NOW() - INTERVAL '5 hours');
        -- Open
        INSERT INTO trades (user_id, stock_symbol, trade_type, quantity, entry_price, status, placed_at)
        VALUES (u_norm_id, 'RELIANCE', 'BUY', 2, 2950, 'OPEN', NOW() - INTERVAL '1 hour');
    END IF;

END $$;

-- 4. MANUALLY POPULATE SUSPICIOUS_USERS (For immediate Dashboard visibility)
INSERT INTO suspicious_users (user_id, risk_score, flags)
SELECT id, 92.5, ARRAY['High profit anomaly', 'Unusual win rate', 'Statistical Outlier']
FROM users WHERE email = 'fraud_high@stocksim.dev'
ON CONFLICT (user_id) DO UPDATE SET risk_score = 92.5, flags = ARRAY['High profit anomaly', 'Unusual win rate', 'Statistical Outlier'];

INSERT INTO suspicious_users (user_id, risk_score, flags)
SELECT id, 88, ARRAY['High frequency trading', 'Repeated identical trades', 'Bot signature detected']
FROM users WHERE email = 'fraud_bot@stocksim.dev'
ON CONFLICT (user_id) DO UPDATE SET risk_score = 88, flags = ARRAY['High frequency trading', 'Repeated identical trades', 'Bot signature detected'];
