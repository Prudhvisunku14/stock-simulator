// src/services/api.js
// Central API service - all backend calls go through here

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Auto-attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── AUTH ───────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login:  (email, password) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
  updateSettings: (settings) => api.patch('/auth/settings', settings),
};

// ── STOCKS ─────────────────────────────────────
export const stocksAPI = {
  getAll:        (search = '') => api.get(`/stocks?search=${search}`),
  getBySector:   (sector) => api.get(`/stocks/sector/${sector}`),
  getTopGainers: () => api.get('/stocks/top-gainers'),
  getTopLosers:  () => api.get('/stocks/top-losers'),
  getMostActive: () => api.get('/stocks/most-active'),
  getTrends:     () => api.get('/stocks/trends'),
  getMarketData: (symbol, timeframe = '1d', limit = 100) =>
    api.get(`/stocks/market-data/${symbol}?timeframe=${timeframe}&limit=${limit}`),
  getYahooMarketData: (symbol, timeframe = '1d') =>
    api.get(`/stocks/yahoo/${symbol}?timeframe=${timeframe}`),
};

// ── WATCHLIST ──────────────────────────────────
export const watchlistAPI = {
  get:    (userId) => api.get(`/watchlist/${userId}`),
  add:    (stock_symbol) => api.post('/watchlist/add', { stock_symbol }),
  remove: (stock_symbol) => api.delete('/watchlist/remove', { data: { stock_symbol } }),
};

// ── ML PATTERNS ────────────────────────────────
export const mlAPI = {
  predict:     (stock_symbol, candle_count = 50) =>
    api.post('/ml/predict', { stock_symbol, candle_count }),
  getPatterns: (stock_symbol) => api.get(`/ml/patterns/${stock_symbol}`),
};

// ── TRADES ─────────────────────────────────────
export const tradesAPI = {
  place:        (data) => api.post('/trades/place', data),
  close:        (trade_id) => api.post('/trades/close', { trade_id }),
  getPortfolio: (userId) => api.get(`/trades/portfolio/${userId}`),
};

// ── NOTIFICATIONS ──────────────────────────────
export const notificationsAPI = {
  get:      (userId) => api.get(`/notifications/${userId}`),
  markRead: (id)     => api.put('/notifications/mark-read', { notification_id: id }),
  markAll:  ()       => api.put('/notifications/mark-read', {}),
};

// ── ALERTS ─────────────────────────────────────
export const alertsAPI = {
  get:      ()   => api.get('/alerts'),
  markRead: (id) => api.put(`/alerts/${id}/read`),
  delete:   (id) => api.delete(`/alerts/${id}`),
};

// ── ADMIN ──────────────────────────────────────
export const adminAPI = {
  getSummary:   () => api.get('/admin/analytics/summary'),
  getUsers:     () => api.get('/admin/analytics/users'),
  getTrades:    () => api.get('/admin/analytics/trades'),
  getSectors:   () => api.get('/admin/analytics/sectors'),
  getStocks:    () => api.get('/admin/analytics/stocks'),
  getAlerts:    () => api.get('/admin/analytics/alerts'),
  controlStock: (data) => api.post('/admin/stocks/control', data),
  adjustBalance:(userId, data) => api.post(`/admin/users/${userId}/balance`, data),
  
  // Fraud Detection
  getFraudUsers:() => api.get('/admin/fraud/users'),
  sendWarning:  (data) => api.post('/admin/fraud/warn', data),
  disableUser:  (data) => api.post('/admin/fraud/disable', data),
};

export default api;
