// backend/run_fraud_migration.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function run() {
    console.log('🚀 Running fraud detection setup...');
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'fraud_setup.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Fraud setup migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

run();
