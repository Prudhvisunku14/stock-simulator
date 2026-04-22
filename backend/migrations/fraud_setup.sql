-- backend/migrations/fraud_setup.sql

-- 1. Create suspicious_users table
CREATE TABLE IF NOT EXISTS suspicious_users (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  risk_score FLOAT,
  flags TEXT[],
  status VARCHAR DEFAULT 'ACTIVE', -- ACTIVE / RESOLVED
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add is_disabled to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false;

-- 3. Insert Dummy Fraudulent Users
-- (Using some random emails that sound like fraud test)
INSERT INTO users (name, email, mobile_number, password, balance, role, is_active)
VALUES 
('Fraud Bot 1', 'fraud1@stocksim.dev', '9999999901', '$2b$10$7R6J5U6zN5W9Q9R9Q9R9QeXk5C5C5C5C5C5C5C5C5C5C5C5C5', 500000, 'USER', true),
('Fraud Bot 2', 'fraud2@stocksim.dev', '9999999902', '$2b$10$7R6J5U6zN5W9Q9R9Q9R9QeXk5C5C5C5C5C5C5C5C5C5C5C5C5', 700000, 'USER', true),
('Normal User', 'normal1@stocksim.dev', '9999999903', '$2b$10$7R6J5U6zN5W9Q9R9Q9R9QeXk5C5C5C5C5C5C5C5C5C5C5C5C5', 100000, 'USER', true)
ON CONFLICT (email) DO NOTHING;

-- 4. Ensure Admin User exists
INSERT INTO users (name, email, mobile_number, password, balance, role, is_active)
VALUES 
('Aarav Shah', 'aarav.shah0@stocksim.dev', '9876543210', '$2b$10$7R6J5U6zN5W9Q9R9Q9R9QeXk5C5C5C5C5C5C5C5C5C5C5C5C5', 1000000, 'ADMIN', true)
ON CONFLICT (email) DO NOTHING;

-- 5. Insert Suspicious Trades for fraud1 (High profit + frequent)
-- Assuming we have stocks like 'RELIANCE', 'TCS' from seed_stocks.sql
DO $$
DECLARE
    u1_id INT;
    u2_id INT;
    n1_id INT;
BEGIN
    SELECT id INTO u1_id FROM users WHERE email = 'fraud1@stocksim.dev';
    SELECT id INTO u2_id FROM users WHERE email = 'fraud2@stocksim.dev';
    SELECT id INTO n1_id FROM users WHERE email = 'normal1@stocksim.dev';

    IF u1_id IS NOT NULL THEN
        -- Insert many trades in a short window
        FOR i IN 1..60 LOOP
            INSERT INTO trades (user_id, stock_symbol, trade_type, quantity, entry_price, status, placed_at)
            VALUES (u1_id, 'RELIANCE', 'BUY', 100, 2500 + i, 'CLOSED', NOW() - (i || ' seconds')::interval);
            
            INSERT INTO trade_history (user_id, stock_symbol, trade_type, quantity, entry_price, exit_price, pnl, pnl_percent, closed_at)
            VALUES (u1_id, 'RELIANCE', 'BUY', 100, 2500 + i, 2550 + i, 5000, 2.0, NOW() - (i || ' seconds')::interval);
        END LOOP;
    END IF;

    IF u2_id IS NOT NULL THEN
        -- Repeated identical trades (Bot pattern)
        FOR i IN 1..10 LOOP
            INSERT INTO trades (user_id, stock_symbol, trade_type, quantity, entry_price, status, placed_at)
            VALUES (u2_id, 'TCS', 'SELL', 50, 3800.00, 'CLOSED', NOW() - (i || ' minutes')::interval);
            
            INSERT INTO trade_history (user_id, stock_symbol, trade_type, quantity, entry_price, exit_price, pnl, pnl_percent, closed_at)
            VALUES (u2_id, 'TCS', 'SELL', 50, 3800.00, 3790.00, 500, 0.26, NOW() - (i || ' minutes')::interval);
        END LOOP;
    END IF;

    IF n1_id IS NOT NULL THEN
        -- Normal activity
        INSERT INTO trades (user_id, stock_symbol, trade_type, quantity, entry_price, status, placed_at)
        VALUES (n1_id, 'INFY', 'BUY', 10, 1600.00, 'OPEN', NOW() - INTERVAL '1 day');
    END IF;
END $$;
