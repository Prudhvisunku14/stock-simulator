// controllers/stockController.js
// Handles stock listing and market data (OHLC candles)

const { query } = require('../config/db');
const axios = require('axios');

// ─────────────────────────────────────────
// GET /api/stocks
// Get all available stocks
// ─────────────────────────────────────────
const getAllStocks = async (req, res) => {
  try {
    const { search } = req.query;
    let queryStr = 'SELECT * FROM stocks WHERE is_active = true';
    let params = [];

    if (search) {
      queryStr += ' AND (symbol ILIKE $1 OR company_name ILIKE $1)';
      params.push(`%${search}%`);
    }

    queryStr += ' ORDER BY symbol ASC';

    const result = await query(queryStr, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stocks', error: error.message });
  }
};

// ─────────────────────────────────────────
// GET /api/stocks/market-data/:stock_symbol
// Get OHLC candles for a stock
// Query params: ?timeframe=1d&limit=100
// ─────────────────────────────────────────
const getMarketData = async (req, res) => {
  try {
    const { stock_symbol } = req.params;
    const { timeframe = '1d', limit = 100 } = req.query;

    const result = await query(
      `SELECT * FROM market_data 
       WHERE stock_symbol = $1 AND timeframe = $2
       ORDER BY time DESC
       LIMIT $3`,
      [stock_symbol.toUpperCase(), timeframe, parseInt(limit)]
    );

    // Return in chronological order (oldest first for charting)
    const candles = result.rows.reverse();

    res.json({
      success: true,
      stock_symbol,
      timeframe,
      count: candles.length,
      data: candles
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching market data', error: error.message });
  }
};

// ─────────────────────────────────────────
// POST /api/stocks/market-data/fetch
// Manually insert/seed market data (for dev/testing)
// Body: { stock_symbol, candles: [{time, open, high, low, close, volume}] }
// ─────────────────────────────────────────
const saveMarketData = async (req, res) => {
  try {
    const { stock_symbol, candles, timeframe = '1d' } = req.body;

    if (!stock_symbol || !candles || !Array.isArray(candles)) {
      return res.status(400).json({ success: false, message: 'stock_symbol and candles array required' });
    }

    let inserted = 0;

    for (const candle of candles) {
      await query(
        `INSERT INTO market_data (stock_symbol, time, open_price, high_price, low_price, close_price, volume, timeframe)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (stock_symbol, time, timeframe) DO UPDATE
         SET open_price=$3, high_price=$4, low_price=$5, close_price=$6, volume=$7`,
        [
          stock_symbol.toUpperCase(),
          candle.time,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume || 0,
          timeframe
        ]
      );
      inserted++;
    }

    res.json({ success: true, message: `${inserted} candles saved`, stock_symbol });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving market data', error: error.message });
  }
};

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

// Simple in-memory cache: { "SYMBOL_TIMEFRAME": { timestamp, data } }
const marketCache = {};
const CACHE_TTL = 60 * 1000; // 1 minute cache duration

// ─────────────────────────────────────────
// GET /api/stocks/yahoo/:symbol
// Fetch OHLC from Yahoo, return immediately, and asynchronously upsert DB
// ─────────────────────────────────────────
const getYahooMarketData = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1d', range = '1y' } = req.query;

    if (!symbol) {
      return res.status(400).json({ success: false, message: 'Stock symbol is required' });
    }

    // Checking In-Memory Cache
    const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;
    if (marketCache[cacheKey] && (Date.now() - marketCache[cacheKey].timestamp < CACHE_TTL)) {
      console.log(`[Cache Hit] Serving ${symbol} (${timeframe}) from memory caching`);
      return res.json({
        success: true,
        stock_symbol: symbol.toUpperCase(),
        timeframe,
        count: marketCache[cacheKey].data.length,
        cached: true,
        data: marketCache[cacheKey].data
      });
    }

    // Auto-append .NS for Indian stocks if no suffix exists
    let ySymbol = symbol.toUpperCase();
    if (!ySymbol.includes('.')) {
      ySymbol += '.NS';
    }

    // Map timeframe to yahoo finance intervals
    const intervalMap = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1d': '1d'
    };

    const interval = intervalMap[timeframe];
    if (!interval) {
      return res.status(400).json({ success: false, message: 'Invalid timeframe. Use 1m, 5m, 15m, or 1d' });
    }

    // Fetch from Yahoo
    const queryOptions = { period1: '1970-01-01', interval: interval };
    
    // Applying Yahoo's strictest range restrictions based on intervals
    if (interval === '1m') {
      queryOptions.period1 = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Max 7 days
    } else if (interval === '5m' || interval === '15m') {
      queryOptions.period1 = new Date(Date.now() - 59 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Max 60 days
    } else {
      queryOptions.period1 = '2010-01-01'; // Max back
    }

    const result = await yahooFinance.chart(ySymbol, queryOptions);

    let quotes = result?.quotes || [];
    if (quotes.length === 0) {
      return res.status(404).json({ success: false, message: 'No data found for symbol (may be delisted or invalid)' });
    }

    // Standardize to required format
    const formattedData = quotes.map(q => ({
      timestamp: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume || 0
    })).filter(q => q.open !== null && q.close !== null); // Remove null periods

    // Update Cache
    marketCache[cacheKey] = {
      timestamp: Date.now(),
      data: formattedData
    };

    // 1) Return it immediately to frontend
    res.json({
      success: true,
      stock_symbol: symbol.toUpperCase(),
      timeframe,
      count: formattedData.length,
      cached: false,
      data: formattedData
    });

    // 2) Asynchronously upsert into PostgreSQL market_data
    // Wrap in async IIFE so we don't await it
    (async () => {
      try {
        let inserted = 0;
        const dbSymbol = symbol.toUpperCase();
        for (const candle of formattedData) {
          await query(
            `INSERT INTO market_data (stock_symbol, time, open_price, high_price, low_price, close_price, volume, timeframe)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (stock_symbol, time, timeframe) DO UPDATE
             SET open_price=$3, high_price=$4, low_price=$5, close_price=$6, volume=$7`,
            [
              dbSymbol,
              candle.timestamp,
              candle.open,
              candle.high,
              candle.low,
              candle.close,
              candle.volume,
              timeframe
            ]
          );
          inserted++;
        }
        console.log(`[YahooAsync] Synced ${inserted} candles to DB for ${dbSymbol} (${timeframe})`);
      } catch (err) {
        console.error('[YahooAsync] Failed to sync data to DB:', err.message);
      }
    })();

  } catch (error) {
    if (error.name === 'FailedYahooValidationError' || error.message.includes('Not Found')) {
        return res.status(404).json({ success: false, message: `Invalid symbol or data not found: ${symbol}` });
    }
    console.error('Yahoo Fetch Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch from Yahoo API', error: error.message });
  }
};

const getStockTrends = async (req, res) => {
  try {
    const result = await query(`
      WITH last_two_days AS (
        SELECT 
          stock_symbol, 
          close_price, 
          time,
          volume,
          ROW_NUMBER() OVER (PARTITION BY stock_symbol ORDER BY time DESC) as rn
        FROM market_data
        WHERE timeframe = '1d'
      ),
      trends AS (
        SELECT 
          curr.stock_symbol,
          curr.close_price as last_price,
          prev.close_price as prev_price,
          curr.volume,
          ((curr.close_price - prev.close_price) / prev.close_price * 100) as change_percent
        FROM last_two_days curr
        LEFT JOIN last_two_days prev ON curr.stock_symbol = prev.stock_symbol AND prev.rn = 2
        WHERE curr.rn = 1
      )
      SELECT t.*, s.company_name, s.exchange, s.sector
      FROM trends t
      JOIN stocks s ON t.stock_symbol = s.symbol
      ORDER BY t.change_percent DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stock trends', error: error.message });
  }
};

const getStocksBySector = async (req, res) => {
  try {
    const { sector } = req.params;
    const result = await query(
      'SELECT * FROM stocks WHERE sector = $1 AND is_active = true ORDER BY symbol ASC',
      [sector]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stocks by sector', error: error.message });
  }
};

const getTopGainers = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM stocks WHERE is_active = true ORDER BY change_percent DESC LIMIT 10'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching top gainers', error: error.message });
  }
};

const getTopLosers = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM stocks WHERE is_active = true ORDER BY change_percent ASC LIMIT 10'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching top losers', error: error.message });
  }
};

const getMostActive = async (req, res) => {
  try {
    // Mocking most active using higher randomized change or just top 10 for now
    // In a real system, we'd join with market_data volume
    const result = await query(
      'SELECT * FROM stocks WHERE is_active = true ORDER BY ABS(change_percent) DESC LIMIT 10'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching most active stocks', error: error.message });
  }
};

module.exports = { 
  getAllStocks, 
  getMarketData, 
  saveMarketData, 
  getYahooMarketData, 
  getStockTrends,
  getStocksBySector,
  getTopGainers,
  getTopLosers,
  getMostActive
};
