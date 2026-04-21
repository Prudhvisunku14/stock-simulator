-- ============================================================
-- STOCK SIMULATOR - FULL DATABASE SCHEMA
-- Paste this entire script into pgAdmin Query Tool and run it
-- ============================================================

-- Drop existing tables if re-running (safe for dev)
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS suspicious_users CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS api_logs CASCADE;
DROP TABLE IF EXISTS system_stats CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS trade_history CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS pattern_statistics CASCADE;
DROP TABLE IF EXISTS pattern_logs CASCADE;
DROP TABLE IF EXISTS ml_patterns CASCADE;
DROP TABLE IF EXISTS patterns CASCADE;
DROP TABLE IF EXISTS market_data CASCADE;
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    mobile_number   VARCHAR(15) UNIQUE NOT NULL,
    name            VARCHAR(100),
    email           VARCHAR(150),
    balance         NUMERIC(12,2) DEFAULT 100000.00,  -- virtual money
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: admin
-- ============================================================
CREATE TABLE admin (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    email           VARCHAR(150),
    role            VARCHAR(50) DEFAULT 'admin',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: stocks
-- ============================================================
CREATE TABLE stocks (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(20) UNIQUE NOT NULL,
    company_name    VARCHAR(200) NOT NULL,
    exchange        VARCHAR(50) DEFAULT 'NSE',
    sector          VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: user_sessions
-- ============================================================
CREATE TABLE user_sessions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(500) UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    ip_address      VARCHAR(50),
    device_info     TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: watchlist
-- ============================================================
CREATE TABLE watchlist (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stock_symbol    VARCHAR(20) REFERENCES stocks(symbol) ON DELETE CASCADE,
    added_at        TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, stock_symbol)
);

-- ============================================================
-- TABLE: market_data (OHLC Candles)
-- ============================================================
CREATE TABLE market_data (
    id              SERIAL PRIMARY KEY,
    stock_symbol    VARCHAR(20) REFERENCES stocks(symbol) ON DELETE CASCADE,
    time            TIMESTAMP NOT NULL,
    open_price      NUMERIC(12,2) NOT NULL,
    high_price      NUMERIC(12,2) NOT NULL,
    low_price       NUMERIC(12,2) NOT NULL,
    close_price     NUMERIC(12,2) NOT NULL,
    volume          BIGINT DEFAULT 0,
    timeframe       VARCHAR(10) DEFAULT '1d',  -- 1m, 5m, 1h, 1d
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(stock_symbol, time, timeframe)
);

-- ============================================================
-- TABLE: patterns (manual/static patterns)
-- ============================================================
CREATE TABLE patterns (
    id              SERIAL PRIMARY KEY,
    pattern_name    VARCHAR(100) NOT NULL,
    description     TEXT,
    pattern_type    VARCHAR(50),  -- bullish / bearish / neutral
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: ml_patterns (ML model detected patterns)
-- ============================================================
CREATE TABLE ml_patterns (
    id              SERIAL PRIMARY KEY,
    stock_symbol    VARCHAR(20) REFERENCES stocks(symbol) ON DELETE CASCADE,
    pattern_type    VARCHAR(100) NOT NULL,
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP NOT NULL,
    probability     NUMERIC(5,4),      -- e.g. 0.7200
    signal          VARCHAR(10),       -- BUY / SELL / HOLD
    candles_used    INTEGER,
    raw_response    JSONB,             -- store full ML API response
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: pattern_logs (log of every ML API call)
-- ============================================================
CREATE TABLE pattern_logs (
    id              SERIAL PRIMARY KEY,
    stock_symbol    VARCHAR(20),
    request_data    JSONB,
    response_data   JSONB,
    status          VARCHAR(20),       -- success / error
    duration_ms     INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: pattern_statistics
-- ============================================================
CREATE TABLE pattern_statistics (
    id              SERIAL PRIMARY KEY,
    stock_symbol    VARCHAR(20) REFERENCES stocks(symbol) ON DELETE CASCADE,
    pattern_type    VARCHAR(100),
    total_detected  INTEGER DEFAULT 0,
    successful      INTEGER DEFAULT 0,
    failed          INTEGER DEFAULT 0,
    avg_probability NUMERIC(5,4),
    last_updated    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: trades (open/active trades)
-- ============================================================
CREATE TABLE trades (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stock_symbol    VARCHAR(20) REFERENCES stocks(symbol) ON DELETE CASCADE,
    trade_type      VARCHAR(10) NOT NULL,    -- BUY / SELL
    quantity        INTEGER NOT NULL,
    entry_price     NUMERIC(12,2) NOT NULL,
    stop_loss       NUMERIC(12,2),
    target_price    NUMERIC(12,2),
    status          VARCHAR(20) DEFAULT 'OPEN',  -- OPEN / CLOSED
    ml_pattern_id   INTEGER REFERENCES ml_patterns(id),
    placed_at       TIMESTAMP DEFAULT NOW(),
    closed_at       TIMESTAMP
);

-- ============================================================
-- TABLE: trade_history (closed trades with P&L)
-- ============================================================
CREATE TABLE trade_history (
    id              SERIAL PRIMARY KEY,
    trade_id        INTEGER REFERENCES trades(id),
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stock_symbol    VARCHAR(20),
    trade_type      VARCHAR(10),
    quantity        INTEGER,
    entry_price     NUMERIC(12,2),
    exit_price      NUMERIC(12,2),
    pnl             NUMERIC(12,2),     -- profit/loss
    pnl_percent     NUMERIC(8,4),
    closed_at       TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(50) DEFAULT 'info',   -- info / alert / trade / pattern
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: user_activity_logs
-- ============================================================
CREATE TABLE user_activity_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    details         JSONB,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: suspicious_users
-- ============================================================
CREATE TABLE suspicious_users (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason          TEXT,
    flagged_at      TIMESTAMP DEFAULT NOW(),
    resolved        BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- TABLE: admin_logs
-- ============================================================
CREATE TABLE admin_logs (
    id              SERIAL PRIMARY KEY,
    admin_id        INTEGER REFERENCES admin(id),
    action          VARCHAR(200) NOT NULL,
    target_table    VARCHAR(100),
    target_id       INTEGER,
    details         JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: system_stats
-- ============================================================
CREATE TABLE system_stats (
    id              SERIAL PRIMARY KEY,
    stat_date       DATE UNIQUE NOT NULL,
    total_users     INTEGER DEFAULT 0,
    active_users    INTEGER DEFAULT 0,
    total_trades    INTEGER DEFAULT 0,
    total_patterns  INTEGER DEFAULT 0,
    api_calls       INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE: api_logs
-- ============================================================
CREATE TABLE api_logs (
    id              SERIAL PRIMARY KEY,
    endpoint        VARCHAR(200),
    method          VARCHAR(10),
    user_id         INTEGER,
    status_code     INTEGER,
    duration_ms     INTEGER,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX idx_market_data_symbol_time    ON market_data(stock_symbol, time);
CREATE INDEX idx_ml_patterns_symbol_start   ON ml_patterns(stock_symbol, start_time);
CREATE INDEX idx_trades_user_id             ON trades(user_id);
CREATE INDEX idx_trades_status              ON trades(status);
CREATE INDEX idx_notifications_user         ON notifications(user_id, is_read);
CREATE INDEX idx_sessions_token             ON user_sessions(token);
CREATE INDEX idx_watchlist_user             ON watchlist(user_id);
CREATE INDEX idx_activity_logs_user         ON user_activity_logs(user_id);

-- ============================================================
-- SEED DATA - Sample Stocks
-- ============================================================
INSERT INTO stocks (symbol, company_name, exchange, sector) VALUES
('RELIANCE',  'Reliance Industries Ltd',       'NSE', 'Energy'),
('TCS',       'Tata Consultancy Services',     'NSE', 'IT'),
('INFY',      'Infosys Ltd',                   'NSE', 'IT'),
('HDFCBANK',  'HDFC Bank Ltd',                 'NSE', 'Banking'),
('ICICIBANK', 'ICICI Bank Ltd',                'NSE', 'Banking'),
('WIPRO',     'Wipro Ltd',                     'NSE', 'IT'),
('SBIN',      'State Bank of India',           'NSE', 'Banking'),
('TATAMOTORS','Tata Motors Ltd',               'NSE', 'Automobile'),
('AAPL',      'Apple Inc',                     'NASDAQ', 'Technology'),
('GOOGL',     'Alphabet Inc',                  'NASDAQ', 'Technology');

-- Sample admin user (password: admin123 - change in production!)
INSERT INTO admin (username, password_hash, email, role) VALUES
('admin', '$2b$10$examplehashedpassword', 'admin@stocksim.com', 'superadmin');

-- Sample patterns
INSERT INTO patterns (pattern_name, description, pattern_type) VALUES
('Double Top',     'Bearish reversal pattern with two peaks', 'bearish'),
('Double Bottom',  'Bullish reversal with two troughs',       'bullish'),
('Head and Shoulders', 'Classic reversal pattern',            'bearish'),
('Bull Flag',      'Continuation pattern after rally',        'bullish'),
('Cup and Handle', 'Bullish continuation pattern',            'bullish');

-- ============================================================
-- DONE! Your schema is ready.
-- ============================================================
