import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  stocksAPI, 
  watchlistAPI, 
  alertsAPI, 
  tradesAPI, 
  authAPI 
} from '../services/api';
import { 
  LayoutDashboard, 
  Plus, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  BarChart, 
  Clock, 
  Trash2, 
  ChevronRight,
  Zap,
  Bell,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const DashboardPage = ({ user }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [trends, setTrends] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [globalAlertsEnabled, setGlobalAlertsEnabled] = useState(user?.receive_global_alerts || false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use standard naming and avoid destructuring error risks
      const watchResponse = await watchlistAPI.get(user.id);
      const trendsResponse = await stocksAPI.getTrends();
      const alertsResponse = await alertsAPI.get();
      const portfolioResponse = await tradesAPI.getPortfolio(user.id);

      setWatchlist(watchResponse.data?.data || []);
      setTrends(trendsResponse.data?.data ? trendsResponse.data.data.slice(0, 5) : []);
      setAlerts(alertsResponse.data?.data ? alertsResponse.data.data.slice(0, 3) : []);
      setPortfolio(portfolioResponse.data?.data || null);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWatchlist = async (e, symbol) => {
    e.stopPropagation();
    try {
      await watchlistAPI.remove(symbol);
      setWatchlist(prev => prev.filter(w => w.stock_symbol !== symbol));
      setMessage({ type: 'success', text: `${symbol} removed from watchlist` });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleGlobalAlerts = async () => {
    const newValue = !globalAlertsEnabled;
    setGlobalAlertsEnabled(newValue);
    try {
      // Use authAPI to update settings
      await authAPI.updateSettings({ receive_global_alerts: newValue });
      setMessage({ type: 'success', text: `Global alerts ${newValue ? 'enabled' : 'disabled'}` });
      
      // Sync local storage
      const updatedUser = { ...user, receive_global_alerts: newValue };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Failed to update settings:', err);
      setGlobalAlertsEnabled(!newValue); 
      setMessage({ type: 'error', text: 'Failed to update alert settings' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!user) {
    return <div className="p-20 text-center font-bold text-gray-500">Please login to view dashboard.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
             <LayoutDashboard className="w-8 h-8 text-primary" />
             Dashboard
           </h1>
           <p className="text-sm font-medium text-gray-500">Welcome back, {user.name || 'Trader'}. Market is open.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Scan</span>
              <span className={`text-xs font-bold ${globalAlertsEnabled ? 'text-primary' : 'text-gray-400'}`}>
                {globalAlertsEnabled ? 'Real-time Enabled' : 'Disabled'}
              </span>
           </div>
           <button 
             onClick={handleToggleGlobalAlerts}
             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${globalAlertsEnabled ? 'bg-primary' : 'bg-gray-200'}`}
           >
             <span
               className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalAlertsEnabled ? 'translate-x-6' : 'translate-x-1'}`}
             />
           </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl border text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
          <Zap className="w-4 h-4" />
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Watchlist */}
        <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    My Highlights
                </h2>
                <button 
                  onClick={() => navigate('/markets')}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                    Explore Markets <Plus className="w-3 h-3" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {watchlist.length === 0 ? (
                    <div className="col-span-2 card p-12 text-center border-dashed border-2 flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-50 rounded-full">
                            <Star className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 max-w-xs">Your watchlist is empty. Track stocks to see them here.</p>
                        <button onClick={() => navigate('/markets')} className="btn btn-primary">Browse Markets</button>
                    </div>
                ) : (
                    watchlist.map(item => (
                        <div 
                           key={item.id}
                           onClick={() => navigate(`/stock/${item.stock_symbol}`)}
                           className="card card-hover cursor-pointer group relative"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-gray-900">{item.stock_symbol}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[120px]">{item.company_name}</p>
                                </div>
                                <button 
                                    onClick={(e) => handleRemoveWatchlist(e, item.stock_symbol)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-end justify-between">
                                <div className="text-xl font-black text-gray-900">
                                    ₹{parseFloat(item.last_price || 0).toLocaleString()}
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-bold ${parseFloat(item.change_percent || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {parseFloat(item.change_percent || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {Math.abs(parseFloat(item.change_percent || 0)).toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Market Movers */}
            <div className="pt-4 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-success" />
                    Market Movers
                </h2>
                <div className="card p-0 overflow-hidden">
                    <div className="divide-y divide-gray-50">
                        {trends.map(stock => (
                            <div 
                                key={stock.stock_symbol}
                                onClick={() => navigate(`/stock/${stock.stock_symbol}`)}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center font-black text-primary text-xs">
                                        {stock.stock_symbol.substring(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-sm leading-none mb-1">{stock.stock_symbol}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[150px]">{stock.company_name}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-6">
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">₹{parseFloat(stock.last_price).toLocaleString()}</p>
                                        <p className={`text-[10px] font-black ${stock.change_percent >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {stock.change_percent >= 0 ? '+' : ''}{parseFloat(stock.change_percent).toFixed(2)}%
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
            <div className="card bg-primary border-none shadow-xl shadow-blue-100 overflow-hidden relative group">
                <div className="relative z-10 text-white">
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Portfolio Balance</p>
                    <h2 className="text-3xl font-black mb-6">₹{(portfolio?.user?.balance || user.balance || 100000).toLocaleString('en-IN')}</h2>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 rounded-xl p-3 flex-1 text-center">
                            <span className="text-[9px] font-black opacity-60 block">POSITIONS</span>
                            <span className="text-sm font-bold">{portfolio?.summary.open_positions || 0}</span>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 flex-1 text-center">
                            <span className="text-[9px] font-black opacity-60 block">NET RETURN</span>
                            <span className="text-sm font-bold">12.4%</span>
                        </div>
                    </div>
                </div>
                <Zap className="absolute bottom-[-10px] right-[-10px] w-24 h-24 text-white opacity-[0.1] group-hover:scale-110 transition-transform duration-700" />
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Live Alerts
                </h2>
                <div className="space-y-3">
                    {alerts.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-500 italic">
                            No active signals.
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div 
                                key={alert.id}
                                className="p-4 rounded-2xl border bg-white shadow-sm flex gap-3 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate(`/stock/${alert.stock_symbol}`)}
                            >
                                <div className="p-2 bg-primary/5 rounded-xl h-fit text-primary">
                                    <BarChart className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">{alert.message}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">{alert.stock_symbol}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
