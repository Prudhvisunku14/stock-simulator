-- ============================================================
-- STOCK SIMULATOR - DEDICATED STOCK SEEDER
-- This script safely populates the 50 Indian companies.
-- ============================================================

-- Ensure the columns exist (in case you haven't run the full schema update)
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS change_percent NUMERIC(8,4) DEFAULT 0;

-- Upsert 50 Companies
INSERT INTO stocks (symbol, company_name, exchange, sector, price, change_percent) VALUES
-- Banking
('HDFCBANK',   'HDFC Bank Ltd',                 'NSE', 'Banking', 1620.50, 0.45),
('ICICIBANK',  'ICICI Bank Ltd',                'NSE', 'Banking', 1085.20, -0.22),
('SBIN',       'State Bank of India',           'NSE', 'Banking', 780.15, 1.12),
('AXISBANK',   'Axis Bank Ltd',                 'NSE', 'Banking', 1050.40, -0.85),
('KOTAKBANK',  'Kotak Mahindra Bank',           'NSE', 'Banking', 1740.00, 0.15),
('INDUSINDBK', 'IndusInd Bank Ltd',             'NSE', 'Banking', 1450.75, 2.10),

-- IT Services
('TCS',        'Tata Consultancy Services',     'NSE', 'IT Services', 3850.25, -0.45),
('INFY',       'Infosys Ltd',                   'NSE', 'IT Services', 1600.80, 1.25),
('WIPRO',      'Wipro Ltd',                     'NSE', 'IT Services', 485.40, -1.10),
('HCLTECH',    'HCL Technologies Ltd',          'NSE', 'IT Services', 1420.15, 0.65),
('TECHM',      'Tech Mahindra Ltd',             'NSE', 'IT Services', 1250.90, -0.35),
('LTIM',       'LTIMindtree Ltd',               'NSE', 'IT Services', 5100.00, 1.75),

-- Energy
('RELIANCE',   'Reliance Industries Ltd',       'NSE', 'Energy', 2950.40, 0.85),
('ONGC',       'ONGC Ltd',                      'NSE', 'Energy', 270.15, -1.45),
('BPCL',       'Bharat Petroleum Corp',         'NSE', 'Energy', 610.30, 0.55),
('IOC',        'Indian Oil Corp',               'NSE', 'Energy', 175.45, -0.75),
('GAIL',       'GAIL (India) Ltd',              'NSE', 'Energy', 190.20, 1.35),
('ADANIGREEN', 'Adani Green Energy',            'NSE', 'Energy', 1850.60, 2.95),

-- Automobile
('TATAMOTORS', 'Tata Motors Ltd',               'NSE', 'Automobile', 980.45, 1.65),
('MARUTI',     'Maruti Suzuki India',           'NSE', 'Automobile', 12500.00, -0.55),
('BAJAJ-AUTO', 'Bajaj Auto Ltd',                'NSE', 'Automobile', 9100.25, 0.25),
('EICHERMOT',  'Eicher Motors Ltd',             'NSE', 'Automobile', 4600.15, -1.15),
('HEROMOTOCO', 'Hero MotoCorp Ltd',             'NSE', 'Automobile', 4550.80, 0.95),
('ASHOKLEY',   'Ashok Leyland Ltd',             'NSE', 'Automobile', 185.30, -2.10),

-- Consumer Goods
('ITC',        'ITC Ltd',                       'NSE', 'Consumer Goods', 450.25, 0.35),
('HINDUNILVR', 'Hindustan Unilever Ltd',        'NSE', 'Consumer Goods', 2420.60, -0.45),
('NESTLEIND',  'Nestle India Ltd',              'NSE', 'Consumer Goods', 25500.00, 0.15),
('BRITANNIA',  'Britannia Industries',          'NSE', 'Consumer Goods', 4950.40, -1.25),
('DABUR',      'Dabur India Ltd',               'NSE', 'Consumer Goods', 540.15, 0.85),
('MARICO',     'Marico Ltd',                    'NSE', 'Consumer Goods', 520.30, 1.15),

-- Pharma
('SUNPHARMA',  'Sun Pharmaceutical Ind',        'NSE', 'Pharma', 1580.45, 1.45),
('DRREDDY',    'Dr Reddys Laboratories',        'NSE', 'Pharma', 6150.25, -0.65),
('CIPLA',      'Cipla Ltd',                     'NSE', 'Pharma', 1450.80, 0.75),
('DIVISLAB',   'Divis Laboratories Ltd',        'NSE', 'Pharma', 3750.15, -1.35),
('AUROPHARMA', 'Aurobindo Pharma Ltd',          'NSE', 'Pharma', 1120.40, 2.15),
('LUPIN',      'Lupin Ltd',                     'NSE', 'Pharma', 1650.60, 0.55),

-- Metals
('TATASTEEL',  'Tata Steel Ltd',                'NSE', 'Metals', 155.45, 1.95),
('JSWSTEEL',   'JSW Steel Ltd',                 'NSE', 'Metals', 880.30, -0.25),
('HINDALCO',   'Hindalco Industries',           'NSE', 'Metals', 590.15, 0.45),
('VEDL',       'Vedanta Ltd',                   'NSE', 'Metals', 340.80, -2.85),
('NMDC',       'NMDC Ltd',                      'NSE', 'Metals', 210.25, 1.25),

-- Telecom
('BHARTIARTL', 'Bharti Airtel Ltd',             'NSE', 'Telecom', 1220.50, 0.95),
('IDEA',       'Vodafone Idea Ltd',             'NSE', 'Telecom', 13.45, -2.55),

-- Infrastructure
('LT',         'Larsen & Toubro Ltd',           'NSE', 'Infrastructure', 3750.40, 1.15),
('ADANIPORTS', 'Adani Ports & SEZ',             'NSE', 'Infrastructure', 1340.25, -0.95),
('ULTRACEMCO', 'UltraTech Cement Ltd',          'NSE', 'Infrastructure', 9850.60, 0.45),
('GRASIM',     'Grasim Industries Ltd',         'NSE', 'Infrastructure', 2280.15, -1.35)

ON CONFLICT (symbol) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    sector = EXCLUDED.sector,
    price = EXCLUDED.price,
    change_percent = EXCLUDED.change_percent;
