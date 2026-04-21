const { query } = require('./config/db');

async function check() {
  try {
    const res = await query('SELECT id, name, email, role FROM users ORDER BY role ASC');
    console.log('All Users:');
    console.table(res.rows);

    const trades = await query('SELECT COUNT(*) FROM trades');
    console.log('Total Trades in DB:', trades.rows[0].count);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}
check();
