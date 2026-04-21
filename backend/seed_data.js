// backend/seed_data.js
// Run: node seed_data.js
// Seeds: 50 users (incl. 2 admins), 1000 trades, ML patterns, notifications
// Compatible with the fixed schema (role, receive_global_alerts, is_read, stock_symbol on notifications)

require('dotenv').config();
const { query, pool } = require('./config/db');
const bcrypt = require('bcrypt');

// ── Helpers ──────────────────────────────────────────────────
const randInt  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const randItem  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo   = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const hoursLater = (date, h) => new Date(date.getTime() + h * 3600 * 1000);

const INDIAN_NAMES = [
  'Aarav Shah','Vivaan Patel','Aditya Kumar','Vihaan Singh','Arjun Verma',
  'Sai Krishnan','Reyansh Gupta','Ayaan Mehta','Dhruv Sharma','Kabir Joshi',
  'Ananya Iyer','Diya Reddy','Pari Nair','Saanvi Rao','Myra Pillai',
  'Priya Mishra','Riya Chawla','Sneha Desai','Pooja Pandey','Kavya Bhat',
  'Rahul Tiwari','Rohit Yadav','Amit Saxena','Deepak Srivastava','Raj Malhotra',
  'Suresh Kulkarni','Vijay Bose','Manoj Agarwal','Ravi Shukla','Kiran Jain',
  'Neha Bhatt','Shreya Venkatesh','Divya Hegde','Anjali Menon','Sonal Kapoor',
  'Megha Tripathi','Tanvi Doshi','Komal Ahuja','Nisha Bansal','Pallavi Naik',
  'Yash Oberoi','Tejas Patil','Aryan Wagh','Nikhil Pawar','Shubham More',
  'Gaurav Thakur','Harish Nambiar','Akash Pandya','Vinit Ghosh','Mitul Parikh'
];

const SECTORS = ['Technology','Banking','Energy','Automobile','Healthcare','FMCG','Metals'];
const PATTERNS = ['Double Top','Double Bottom','Head and Shoulders','Bull Flag','Inv Head & Shoulders','Ascending Triangle','Descending Triangle'];
const SIGNALS  = ['BUY','SELL','HOLD'];

async function seed() {
  console.log('\n🌱 Starting Full Database Seed...\n');

  try {
    // ── Step 0: Verify DB connection ─────────────────────────
    await query('SELECT 1');
    console.log('✅ Database connected\n');

    // ── Step 1: Fetch stocks ──────────────────────────────────
    const stocksRes = await query('SELECT symbol, price, sector FROM stocks WHERE is_active = true');
    if (stocksRes.rows.length === 0) {
      console.error('❌ No stocks found. Run seed_stocks.sql first:\n  psql -d stock_simulator -f seed_stocks.sql');
      process.exit(1);
    }
    const stocks = stocksRes.rows;
    console.log(`📊 Found ${stocks.length} stocks to trade against\n`);

    // ── Step 2: Create 50 users (48 USER + 2 ADMIN) ──────────
    console.log('👤 Creating 50 users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const createdUserIds = [];

    for (let i = 0; i < 50; i++) {
      const name         = INDIAN_NAMES[i] || `Trader ${i + 1}`;
      const emailBase    = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
      const email        = `${emailBase}${i}@stocksim.dev`;
      const mobile       = `9${randInt(100000000, 999999999)}`;
      const balance      = randFloat(50000, 250000, 2);
      const role         = i < 2 ? 'ADMIN' : 'USER';
      const recvAlerts   = Math.random() > 0.4; // 60% opt-in to global alerts

      try {
        const res = await query(
          `INSERT INTO users (name, email, mobile_number, password, balance, role, receive_global_alerts)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (email) DO UPDATE SET balance = EXCLUDED.balance
           RETURNING id`,
          [name, email, mobile, passwordHash, balance, role, recvAlerts]
        );
        createdUserIds.push(res.rows[0].id);
      } catch (e) {
        // Skip constraint errors silently
      }
    }
    console.log(`   ✅ Created/updated ${createdUserIds.length} users\n`);

    // ── Step 3: Generate 1000 trades ─────────────────────────
    console.log('📈 Generating 1000 trades with realistic timestamps...');
    let tradeCnt = 0;

    for (let t = 0; t < 1000; t++) {
      const userId    = randItem(createdUserIds);
      const stock     = randItem(stocks);
      const tradeType = randItem(['BUY','SELL']);
      const quantity  = randInt(1, 100);
      const basePrice = parseFloat(stock.price) || randFloat(100, 3000);
      // Add ±10% noise around the base price
      const entryPrice = parseFloat((basePrice * randFloat(0.90, 1.10)).toFixed(2));
      const isClosed   = Math.random() < 0.80; // 80% closed
      const status     = isClosed ? 'CLOSED' : 'OPEN';

      // Spread trades over last 90 days, during market hours (9:15–15:30 IST)
      const dayOffset  = randInt(0, 89);
      const minuteOfDay = randInt(9 * 60 + 15, 15 * 60 + 30);
      const placedAt   = daysAgo(dayOffset);
      placedAt.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, randInt(0, 59));

      try {
        const tradeRes = await query(
          `INSERT INTO trades (user_id, stock_symbol, trade_type, quantity, entry_price, status, placed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [userId, stock.symbol, tradeType, quantity, entryPrice, status, placedAt]
        );

        const tradeId = tradeRes.rows[0].id;

        if (isClosed) {
          // Closed 30 min – 8 hours later
          const closedAt  = hoursLater(placedAt, randFloat(0.5, 8));
          // Slightly bullish bias: -4% to +7%
          const movePct   = randFloat(-0.04, 0.07, 4);
          const exitPrice = parseFloat((entryPrice * (1 + movePct)).toFixed(2));
          const pnl       = parseFloat(((exitPrice - entryPrice) * quantity * (tradeType === 'BUY' ? 1 : -1)).toFixed(2));
          const pnlPct    = parseFloat((movePct * (tradeType === 'BUY' ? 1 : -1) * 100).toFixed(4));

          await query(
            `UPDATE trades SET closed_at = $1 WHERE id = $2`,
            [closedAt, tradeId]
          );

          await query(
            `INSERT INTO trade_history (trade_id, user_id, stock_symbol, trade_type, quantity, entry_price, exit_price, pnl, pnl_percent, closed_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [tradeId, userId, stock.symbol, tradeType, quantity, entryPrice, exitPrice, pnl, pnlPct, closedAt]
          );
        }

        tradeCnt++;
      } catch (e) {
        // Skip FK violations (stock might not exist)
      }
    }
    console.log(`   ✅ Inserted ${tradeCnt} trades\n`);

    // ── Step 4: Generate 300 ML patterns ─────────────────────
    console.log('🤖 Generating ML pattern history (300 records)...');
    let patternCnt = 0;

    for (let i = 0; i < 300; i++) {
      const stock     = randItem(stocks);
      const pattern   = randItem(PATTERNS);
      const signal    = randItem(SIGNALS);
      const prob      = randFloat(0.50, 0.97, 4);
      const dayOffset = randInt(0, 60);
      const startTime = daysAgo(dayOffset + 5);
      const endTime   = daysAgo(dayOffset);

      try {
        await query(
          `INSERT INTO ml_patterns (stock_symbol, pattern_type, start_time, end_time, probability, signal)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [stock.symbol, pattern, startTime, endTime, prob, signal]
        );
        patternCnt++;
      } catch (e) {}
    }
    console.log(`   ✅ Inserted ${patternCnt} ML patterns\n`);

    // ── Step 5: Generate 200 global alerts ───────────────────
    console.log('🔔 Generating global alerts + user notifications...');
    let alertCnt = 0, notifCnt = 0;

    // Get all user IDs again (including freshly created ones)
    const allUsersRes = await query('SELECT id, receive_global_alerts FROM users WHERE is_active = true');
    const allUsers    = allUsersRes.rows;

    for (let i = 0; i < 200; i++) {
      const stock     = randItem(stocks);
      const pattern   = randItem(PATTERNS);
      const signal    = randItem(SIGNALS);
      const confidence = randFloat(0.55, 0.97, 4);
      const dayOffset  = randInt(0, 30);
      const createdAt  = daysAgo(dayOffset);

      try {
        const gaRes = await query(
          `INSERT INTO global_alerts (symbol, pattern, signal, confidence, created_at)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [stock.symbol, pattern, signal, confidence, createdAt]
        );
        const gaId = gaRes.rows[0].id;
        alertCnt++;

        // Distribute to up to 10 random opted-in users
        const eligibleUsers = allUsers.filter(u => u.receive_global_alerts);
        const sample = eligibleUsers.sort(() => 0.5 - Math.random()).slice(0, randInt(1, 10));

        for (const u of sample) {
          const title   = `Pattern Alert: ${stock.symbol}`;
          const message = `${pattern} | Signal: ${signal} | Confidence: ${(confidence * 100).toFixed(0)}%`;
          try {
            await query(
              `INSERT INTO notifications (user_id, title, message, type, stock_symbol, is_read, created_at)
               VALUES ($1,$2,$3,'alert',$4,$5,$6)`,
              [u.id, title, message, stock.symbol, Math.random() > 0.4, createdAt]
            );
            notifCnt++;
          } catch (e) {}
        }
      } catch (e) {}
    }
    console.log(`   ✅ Inserted ${alertCnt} global alerts → ${notifCnt} user notifications\n`);

    // ── Step 6: Seed watchlists for 30 users ─────────────────
    console.log('👁  Adding watchlist entries for 30 users...');
    let wlCnt = 0;
    const thirtyUsers = allUsers.slice(0, 30);
    for (const u of thirtyUsers) {
      const picks = stocks.sort(() => 0.5 - Math.random()).slice(0, randInt(2, 8));
      for (const s of picks) {
        try {
          await query(
            `INSERT INTO watchlist (user_id, stock_symbol) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [u.id, s.symbol]
          );
          wlCnt++;
        } catch (e) {}
      }
    }
    console.log(`   ✅ Added ${wlCnt} watchlist entries\n`);

    // ── Summary ───────────────────────────────────────────────
    const finalStats = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM trades'),
      query('SELECT COUNT(*) FROM ml_patterns'),
      query('SELECT COUNT(*) FROM global_alerts'),
      query('SELECT COUNT(*) FROM notifications'),
    ]);

    console.log('═══════════════════════════════════════');
    console.log('  🎉  Seed Complete — Final Stats');
    console.log('═══════════════════════════════════════');
    console.log(`  Users:          ${finalStats[0].rows[0].count}`);
    console.log(`  Trades:         ${finalStats[1].rows[0].count}`);
    console.log(`  ML Patterns:    ${finalStats[2].rows[0].count}`);
    console.log(`  Global Alerts:  ${finalStats[3].rows[0].count}`);
    console.log(`  Notifications:  ${finalStats[4].rows[0].count}`);
    console.log('═══════════════════════════════════════');
    console.log('\n  Admin logins:');
    console.log('  Email: aarav.shah0@stocksim.dev | Password: password123');
    console.log('  Email: vivaan.patel1@stocksim.dev | Password: password123\n');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
