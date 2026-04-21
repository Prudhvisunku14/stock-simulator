// services/volatilityService.js
const { query } = require('../config/db');
const socketService = require('./socketService');

let intervalId = null;

const start = () => {
    if (intervalId) return;

    console.log('📈 Starting Continuous Volatility Service...');

    // Runs every 5 seconds
    intervalId = setInterval(async () => {
        try {
            // 1. Fetch all volatile stocks
            const volatileStocks = await query('SELECT symbol, price FROM stocks WHERE is_volatile = TRUE');

            if (volatileStocks.rows.length === 0) return;

            for (const stock of volatileStocks.rows) {
                // 2. Generate small random fluctuation (-0.5% to +0.5%)
                const changePercent = (Math.random() * 1 - 0.5); 
                const oldPrice = parseFloat(stock.price);
                const newPrice = parseFloat((oldPrice * (1 + changePercent / 100)).toFixed(2));

                if (newPrice === oldPrice) continue;

                // 3. Update database
                await query('UPDATE stocks SET price = $1, change_percent = ((($1 - price)/price)*100), updated_at = NOW() WHERE symbol = $2', [newPrice, stock.symbol]);

                // 4. Broadcast update via Socket.io
                socketService.broadcast('price_update', {
                    symbol: stock.symbol,
                    price: newPrice,
                    change_percent: changePercent.toFixed(4)
                });
            }
        } catch (error) {
            console.error('❌ Volatility Service Error:', error.message);
        }
    }, 5000);
};

const stop = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('📉 Stopped Volatility Service.');
    }
};

module.exports = { start, stop };
