// config/db.js
// PostgreSQL connection using pg (node-postgres) with connection pooling

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool (reuses connections for performance)
const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     parseInt(process.env.DB_PORT) || 5432,
  max:      10,              // max 10 connections in pool
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 10000, // wait 10s before timeout error
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release(); // release test client back to pool
  }
});

// Helper function: run a query with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Query: ${text.substring(0, 50)}... [${duration}ms]`);
    }
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

module.exports = { pool, query };
