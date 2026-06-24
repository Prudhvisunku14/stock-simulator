// init_db.js
// Reads database_setup.sql and executes it against the configured PostgreSQL
// database. Run this as a pre-deploy command before starting the server.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     parseInt(process.env.DB_PORT) || 5432,
  connectionTimeoutMillis: 10000,
});

async function initDb() {
  console.log('🚀 Starting database initialization...');

  const sqlPath = path.join(__dirname, 'database_setup.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error('❌ database_setup.sql not found at:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ Database schema initialized successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
