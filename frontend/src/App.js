import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AnalysisPage from './pages/AnalysisPage';
import TradePage from './pages/TradePage';
import PortfolioPage from './pages/PortfolioPage';
import MarketsPage from './pages/MarketsPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminFraudPage from './pages/AdminFraudPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ── Not logged in → show Login ──
  if (!user) {
    return (
      <Router>
         <Routes>
            <Route path="/login" element={!user ? <LoginPage onLogin={setUser} /> : <Navigate to="/" />} />
            <Route path="/signup" element={!user ? <SignupPage onLogin={setUser} /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
         </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<DashboardPage user={user} />} />
          <Route path="/analysis" element={<AnalysisPage user={user} />} />
          <Route path="/stock/:symbol" element={<AnalysisPage user={user} />} />
          <Route path="/portfolio" element={<PortfolioPage user={user} />} />
          <Route path="/markets" element={<MarketsPage user={user} />} />
          <Route path="/trade" element={<TradePage user={user} />} />
          <Route path="/trade/:symbol" element={<TradePage user={user} />} />
          <Route path="/settings" element={<SettingsPage user={user} />} />
          
          {/* Admin Routes */}
          {user.role === 'ADMIN' && (
            <>
              <Route path="/admin" element={<AdminAnalyticsPage user={user} />} />
              <Route path="/admin/fraud" element={<AdminFraudPage user={user} />} />
            </>
          )}
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
