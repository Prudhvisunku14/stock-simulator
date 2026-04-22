// backend/seed_fraud.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function seed() {
    console.log('🌱 Seeding Fraud Detection Data...');
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'seed_fraud_data.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Fraud data seeded successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

seed();
