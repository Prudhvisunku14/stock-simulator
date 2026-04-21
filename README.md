# 🛠 Stock Simulator — Complete Fix & Setup Guide

## What was fixed

| # | Bug | File(s) Fixed |
|---|-----|---------------|
| 1 | **CORS never applied** — `cors` was imported but `app.use(cors(...))` was missing | `server.js` |
| 2 | **alertController queried non-existent `alerts` table** — should be `notifications` | `alertController.js` |
| 3 | **Socket JWT mismatch** — decoded payload has `userId`, code read `id` (undefined) | `socketService.js` |
| 4 | **`TrendingUp` not imported** in `NotificationBell.js` — React crash | `NotificationBell.js` |
| 5 | **Missing DB columns**: `users.role`, `users.receive_global_alerts`, `notifications.is_read`, `notifications.stock_symbol` | `001_complete_fix.sql` |
| 6 | **Missing `global_alerts` table** — alertEngine crashed on INSERT | `001_complete_fix.sql` |
| 7 | **Signup had no role field** — every user got `null` role, admin middleware always rejected | `SignupPage.js`, `authController.js` |
| 8 | **`adminController` had bad queries** — `pnl_percent` column issues, empty table crashes | `adminController.js` |
| 9 | **ML `/predict` not returning `probability` on 0–1 scale** — confidence was 0–100 | `main.py` |
| 10 | **`alertEngine` confidence threshold 0.7** with mock always generating ≥ 0.70 — bypassed for testing | `alertEngine.js` (now 0.5) |

---

## Step-by-step setup

### 1. Run the DB migration (REQUIRED FIRST)

```bash
psql -U postgres -d stock_simulator -f backend/migrations/001_complete_fix.sql
```

This adds:
- `users.role` (USER/ADMIN)
- `users.receive_global_alerts`
- `notifications.is_read`, `notifications.stock_symbol`
- `global_alerts` table
- `trade_history`, `user_activity_logs` tables (if missing)

---

### 2. Copy fixed files into your project

Replace these files with the fixed versions:

```
backend/server.js                           ← CORS fix
backend/controllers/authController.js       ← role support
backend/controllers/alertController.js      ← queries notifications table
backend/controllers/adminController.js      ← robust queries + summary endpoint
backend/routes/adminRoutes.js               ← new summary route
backend/services/alertEngine.js             ← full global scan, correct distribution
backend/services/socketService.js           ← userId fix in JWT decode
frontend/src/pages/SignupPage.js            ← role selector UI
frontend/src/pages/AdminAnalyticsPage.js    ← full 4-tab dashboard
frontend/src/components/NotificationBell.js ← TrendingUp import + polling fallback
ml-service/main.py                          ← robust /predict endpoint
```

---

### 3. Seed the database (optional but recommended)

```bash
cd backend
node seed_data.js
```

This creates:
- 50 users (48 USER + 2 ADMIN)
- 1,000 realistic trades (over last 90 days)
- 300 ML pattern records
- 200 global alerts → distributed as user notifications
- Watchlists for 30 users

Admin logins after seeding:
- `aarav.shah0@stocksim.dev` / `password123`
- `vivaan.patel1@stocksim.dev` / `password123`

---

### 4. Start the ML service

```bash
cd ml-service
pip install fastapi uvicorn httpx pandas numpy pydantic
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok"}`

---

### 5. Start the backend

```bash
cd backend
npm install
npm start
```

Verify: `curl http://localhost:5000/api/health` → `{"status":"OK",...}`

---

### 6. Start the frontend

```bash
cd frontend
npm install
npm start
```

Open: http://localhost:3000

---

## How alerts flow end-to-end

```
alertEngine (every 30s)
  └─► SELECT stocks FROM stocks WHERE is_active=true
       └─► For each stock: mlService.detectPattern(symbol)
            └─► Fetches candles from market_data table
                 └─► POST http://localhost:8000/predict  (ML service)
                      └─► pattern_detector.py detects pattern
                           └─► Returns { pattern_type, probability, signal }
                                └─► IF probability >= 0.5:
                                     └─► INSERT INTO global_alerts
                                          └─► Find users: receive_global_alerts=true OR watchlist match
                                               └─► INSERT INTO notifications (per user)
                                                    └─► socket.emit("NEW_ALERT", alert)  ← real-time
                                                         └─► NotificationBell updates instantly
```

## Environment variables (backend/.env)

```env
DB_USER=postgres
DB_HOST=127.0.0.1
DB_NAME=stock_simulator
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=change_this_to_something_random_and_long
PORT=5000
NODE_ENV=development
ML_API_URL=http://localhost:8000/predict
FRONTEND_URL=http://localhost:3000
```

## Testing alerts manually

Enable global alerts for your account in Settings, then watch the bell icon.

Or trigger a scan immediately from the Node.js REPL:
```js
require('dotenv').config();
const alertEngine = require('./services/alertEngine');
alertEngine.runGlobalScan().then(() => console.log('done'));
```

## Admin dashboard

Log in as an ADMIN user → click "Admin" in the sidebar.

The dashboard has 4 tabs:
- **Overview** — KPI cards, daily bar chart, monthly area chart, sector pie, buy/sell ratio
- **Traders** — top 10 most active, time-of-day heatmap, profitable/loss stocks
- **Patterns** — global alert counts, top detected patterns bar chart, recent alerts table
- **Controls** — manual stock price override, spike injection
