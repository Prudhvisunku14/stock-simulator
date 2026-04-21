// backend/migrations/add_global_alerts.js
const { query } = require('../config/db');

async function migrate() {
    console.log('🚀 Starting migration: add_global_alerts...');
    try {
        // 1. Add column to users table
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS receive_global_alerts BOOLEAN DEFAULT false;
        `);
        console.log('✅ Added receive_global_alerts to users table');

        // 2. Create global_alerts table
        await query(`
            CREATE TABLE IF NOT EXISTS global_alerts (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                pattern VARCHAR(100) NOT NULL,
                signal VARCHAR(10) NOT NULL,
                confidence NUMERIC(5,4) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Created global_alerts table');

        // 3. Add index for duplicate check performance
        await query(`
            CREATE INDEX IF NOT EXISTS idx_global_alerts_symbol_pattern_time 
            ON global_alerts(symbol, pattern, created_at);
        `);
        console.log('✅ Created indexes for global_alerts');

        console.log('🎉 Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
