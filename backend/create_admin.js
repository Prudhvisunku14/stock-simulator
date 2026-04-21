const { query } = require('./config/db');
const bcrypt = require('bcrypt');

async function createAdmin() {
  try {
    const email = 'admin@stocksim.com';
    const password = 'admin123';
    const name = 'Stock Simulator Admin';
    const role = 'ADMIN';

    console.log('🚀 Creating admin user...');
    
    const hash = await bcrypt.hash(password, 10);
    
    await query(`
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET password = $3, role = $4, name = $1
    `, [name, email, hash, role]);

    console.log('✅ Admin user created/updated successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  } finally {
    process.exit();
  }
}

createAdmin();
