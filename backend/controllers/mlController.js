// controllers/mlController.js
// Calls external ML API for pattern detection and stores results

const axios = require('axios');
const { query } = require('../config/db');
require('dotenv').config();

// ─────────────────────────────────────────
// POST /api/ml/predict
// Call ML API with last N candles for a stock
// Body: { stock_symbol, candle_count: 50, timeframe: "1d" }
// ─────────────────────────────────────────
const predict = async (req, res) => {
  const startTime = Date.now();
  const { stock_symbol, candle_count = 50, timeframe = '1d' } = req.body;

  if (!stock_symbol) {
    return res.status(400).json({ success: false, message: 'stock_symbol is required' });
  }

  try {
    // Step 1: Fetch last N candles from our database
    const candleResult = await query(
      `SELECT time, open_price, high_price, low_price, close_price, volume
       FROM market_data
       WHERE stock_symbol = $1 AND timeframe = $2
       ORDER BY time DESC
       LIMIT $3`,
      [stock_symbol.toUpperCase(), timeframe, candle_count]
    );

    if (candleResult.rows.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Not enough market data. Need at least 10 candles.'
      });
    }

    // Format candles for ML API (chronological order)
    const candles = candleResult.rows.reverse().map(row => ({
      time:   row.time,
      open:   parseFloat(row.open_price),
      high:   parseFloat(row.high_price),
      low:    parseFloat(row.low_price),
      close:  parseFloat(row.close_price),
      volume: parseInt(row.volume)
    }));

    const requestData = { stock_symbol, candles, timeframe };

    // Step 2: Call ML API
    let mlResponse;
    try {
      const response = await axios.post(process.env.ML_API_URL || 'http://localhost:8000/predict', requestData, {
        timeout: 10000 // 10 second timeout
      });
      
      const mlResultArray = response.data.patterns;
      if (mlResultArray && mlResultArray.length > 0) {
          const p = mlResultArray[mlResultArray.length - 1]; // Use latest detected pattern
          mlResponse = {
              pattern_type: p.pattern,
              start_time: candles[p.start]?.time || new Date().toISOString(),
              end_time: candles[p.end]?.time || new Date().toISOString(),
              probability: p.confidence,
              signal: p.signal
          };
      } else {
          throw new Error('No valid patterns returned from ML Service');
      }
    } catch (mlError) {
      // If ML API is unavailable or returns 0 patterns, return mock data for development fallback
      console.warn('ML API unavailable or empty, using mock data:', mlError.message);
      mlResponse = getMockMLResponse(stock_symbol);
    }

    // Step 3: Store result in database
    const dbResult = await query(
      `INSERT INTO ml_patterns 
        (stock_symbol, pattern_type, start_time, end_time, probability, signal, candles_used, raw_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        stock_symbol.toUpperCase(),
        mlResponse.pattern_type,
        mlResponse.start_time,
        mlResponse.end_time,
        mlResponse.probability,
        mlResponse.signal || null,
        candles.length,
        JSON.stringify(mlResponse)
      ]
    );

    // Step 4: Log the API call
    const duration = Date.now() - startTime;
    await query(
      `INSERT INTO pattern_logs (stock_symbol, request_data, response_data, status, duration_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [stock_symbol, JSON.stringify(requestData), JSON.stringify(mlResponse), 'success', duration]
    );

    // Step 5: Create notification for user if pattern has high probability
    if (req.user && mlResponse.probability >= 0.65) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          `Pattern Detected: ${mlResponse.pattern_type}`,
          `${stock_symbol} - ${mlResponse.pattern_type} with ${(mlResponse.probability * 100).toFixed(0)}% confidence`,
          'pattern'
        ]
      );
    }

    res.json({
      success: true,
      message: 'Pattern detected',
      data: {
        ...mlResponse,
        id: dbResult.rows[0].id,
        stock_symbol,
        candles_analyzed: candles.length
      }
    });

  } catch (error) {
    // Log failed API call
    console.error('❌ ML Prediction Error:', error.message, error.stack);

    await query(
      `INSERT INTO pattern_logs (stock_symbol, request_data, status, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [stock_symbol, JSON.stringify({ stock_symbol, candle_count }), 'error', Date.now() - startTime]
    ).catch(() => {}); // don't throw if logging fails

    res.status(500).json({ success: false, message: 'Prediction failed', error: error.message });
  }
};

// ─────────────────────────────────────────
// GET /api/ml/patterns/:stock_symbol
// Get stored ML patterns for a stock
// ─────────────────────────────────────────
const getPatterns = async (req, res) => {
  try {
    const { stock_symbol } = req.params;
    const { limit = 20 } = req.query;

    const result = await query(
      `SELECT * FROM ml_patterns
       WHERE stock_symbol = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [stock_symbol.toUpperCase(), parseInt(limit)]
    );

    res.json({
      success: true,
      stock_symbol,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching patterns', error: error.message });
  }
};

// ─────────────────────────────────────────
// Helper: Mock ML response for development
// (when real ML API is not running)
// ─────────────────────────────────────────
const getMockMLResponse = (stock_symbol) => {
  const patterns = ['Double Top', 'Double Bottom', 'Head and Shoulders', 'Bull Flag', 'Cup and Handle'];
  const signals  = ['BUY', 'SELL', 'HOLD'];
  const now = new Date();
  const start = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  return {
    pattern_type: patterns[Math.floor(Math.random() * patterns.length)],
    start_time:   start.toISOString().split('T')[0],
    end_time:     now.toISOString().split('T')[0],
    probability:  parseFloat((0.55 + Math.random() * 0.40).toFixed(4)),
    signal:       signals[Math.floor(Math.random() * signals.length)],
    mock:         true  // flag to know this was mocked
  };
};

module.exports = { predict, getPatterns };
