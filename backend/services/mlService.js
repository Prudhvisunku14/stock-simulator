// backend/services/mlService.js
const axios = require('axios');
const { query } = require('../config/db');
require('dotenv').config();

const mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000/predict';
const isDev = process.env.NODE_ENV === 'development';

/**
 * Detect patterns for a given stock
 * @param {string} symbol 
 * @param {number} candleCount 
 * @param {string} timeframe 
 */
async function detectPattern(symbol, candleCount = 50, timeframe = '1d') {
    try {
        // 1. Fetch candles
        const candleResult = await query(
            `SELECT time, open_price, high_price, low_price, close_price, volume
             FROM market_data
             WHERE stock_symbol = $1 AND timeframe = $2
             ORDER BY time DESC
             LIMIT $3`,
            [symbol.toUpperCase(), timeframe, candleCount]
        );

        if (candleResult.rows.length < 10) {
            return { success: false, message: 'Not enough data' };
        }

        const candles = candleResult.rows.reverse().map(row => ({
            time: row.time,
            open: parseFloat(row.open_price),
            high: parseFloat(row.high_price),
            low: parseFloat(row.low_price),
            close: parseFloat(row.close_price),
            volume: parseInt(row.volume)
        }));

        const requestData = { stock_symbol: symbol, candles, timeframe };

        // 2. Call ML API
        try {
            const response = await axios.post(mlApiUrl, requestData, { timeout: 10000 });
            const mlResult = response.data;

            if (mlResult.success === false) {
                console.warn(`[ML SERVICE] ML API returned no patterns for ${symbol}: ${mlResult.message}`);
                throw new Error(mlResult.message);
            }

            return {
                success: true,
                pattern_type: mlResult.pattern_type,
                start_time: mlResult.start_time,
                end_time: mlResult.end_time,
                probability: mlResult.probability,
                signal: mlResult.signal,
                is_mock: false
            };
        } catch (err) {
            if (isDev) {
                console.warn(`[ML SERVICE] Fallback to MOCK for ${symbol}: ${err.message}`);
                return {
                    success: true,
                    ...getMockResponse(symbol),
                    is_mock: true
                };
            }
            console.error(`[ML SERVICE] API Error for ${symbol}: ${err.message}`);
            return { success: false, error: err.message };
        }
    } catch (err) {
        console.error(`[ML SERVICE] Error processing ${symbol}:`, err.message);
        return { success: false, error: err.message };
    }
}

function getMockResponse(symbol) {
    const patterns = ['Double Top', 'Double Bottom', 'Head and Shoulders', 'Bull Flag', 'Cup and Handle'];
    const signals = ['BUY', 'SELL', 'HOLD'];
    const now = new Date();
    return {
        pattern_type: patterns[Math.floor(Math.random() * patterns.length)],
        start_time: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: now.toISOString(),
        probability: parseFloat((0.70 + Math.random() * 0.25).toFixed(4)),
        signal: signals[Math.floor(Math.random() * signals.length)],
    };
}

module.exports = { detectPattern };
