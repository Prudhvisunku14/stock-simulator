import React, { useState, useEffect } from 'react';
import { tradesAPI } from '../services/api';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const PortfolioPage = ({ user }) => {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [closing, setClosing]     = useState(null);
  const [message, setMessage]     = useState('');
  const [isError, setIsError]     = useState(false);

  useEffect(() => { loadPortfolio(); }, []);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const res = await tradesAPI.getPortfolio(user.id);
      setPortfolio(res.data.data);
    } catch (err) {
      console.error('Portfolio error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTrade = async (tradeId) => {
    setClosing(tradeId);
    try {
      const res = await tradesAPI.close(tradeId);
      const d = res.data.data;
      const pnl = d.pnl;
      setMessage(`✅ Position closed! P&L: ₹${pnl.toFixed(2)} (${d.pnl_percent.toFixed(2)}%)`);
      setIsError(false);
      loadPortfolio();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error closing position');
      setIsError(true);
    } finally {
      setClosing(null);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="card border-danger/20 bg-danger/5 flex flex-col items-center p-12 text-center">
        <AlertCircle className="w-12 h-12 text-danger mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Portfolio Unreachable</h2>
        <p className="text-gray-500 max-w-md">We encountered an issue syncing your trading account. Please try again or contact support.</p>
        <button onClick={loadPortfolio} className="mt-6 btn btn-outline">Retry Connection</button>
      </div>
    );
  }

  const { open_trades, trade_history, summary } = portfolio;
  const totalUnrealized = open_trades.reduce((sum, t) => sum + parseFloat(t.unrealized_pnl || 0), 0);
  const portfolioValue = parseFloat(portfolio.user.balance) + totalUnrealized;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-1 flex items-center gap-3">
             <Briefcase className="w-8 h-8 text-primary" />
             Portfolio
          </h1>
          <p className="text-gray-500 font-medium tracking-wide uppercase text-[10px]">Real-time Position Monitoring</p>
        </div>
        <div className="flex gap-2">
            <button onClick={loadPortfolio} className="btn btn-outline py-2.5 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Refresh Data
            </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${isError ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
          <div className={`p-1 rounded-full ${isError ? 'bg-red-100' : 'bg-emerald-100'}`}>
             {isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <span className="text-sm font-bold">{message}</span>
        </div>
      )}

      {/* ── Summary Visualization ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gray-900 border-none relative overflow-hidden group">
            <div className="relative z-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Net Worth</p>
                <h2 className="text-3xl font-black text-white mb-2">₹{portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
                <div className="flex items-center gap-1.5">
                    {totalUnrealized >= 0 ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-danger" />}
                    <span className={`text-sm font-bold ${totalUnrealized >= 0 ? 'text-success' : 'text-danger'}`}>
                        {totalUnrealized >= 0 ? '+' : ''}₹{Math.abs(totalUnrealized).toFixed(2)}
                    </span>
                </div>
            </div>
            <Wallet className="absolute bottom-[-10px] right-[-10px] w-24 h-24 text-white opacity-[0.05] group-hover:scale-110 transition-transform" />
        </div>

        <div className="card card-hover flex flex-col justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Funds</p>
            <div>
                <h3 className="text-2xl font-black text-gray-900">₹{parseFloat(portfolio.user.balance).toLocaleString('en-IN')}</h3>
                <p className="text-[11px] text-gray-500 font-medium">Ready for execution</p>
            </div>
        </div>

        <div className="card card-hover flex flex-col justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Realized Performance</p>
            <div>
                <h3 className={`text-2xl font-black ${summary.total_realized_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {summary.total_realized_pnl >= 0 ? '+' : ''}₹{parseFloat(summary.total_realized_pnl).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">Settled account P&L</p>
            </div>
        </div>

        <div className="card card-hover flex flex-col justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Positions</p>
            <div>
                <h3 className="text-2xl font-black text-gray-900">{open_trades.length} Active</h3>
                <p className="text-[11px] text-gray-500 font-medium text-primary">In market right now</p>
            </div>
        </div>
      </div>

      {/* ── Open Positions ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Live Market Positions
            </h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{open_trades.length} Assets Found</span>
        </div>

        <div className="card p-0 overflow-hidden shadow-lg border-gray-100">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="table-header">Instrument</th>
                            <th className="table-header">Type</th>
                            <th className="table-header">Qty</th>
                            <th className="table-header">Avg. Price</th>
                            <th className="table-header">LTP</th>
                            <th className="table-header text-right">Returns (P&L)</th>
                            <th className="table-header text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {open_trades.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center py-16 text-gray-400 italic">No active positions. Your portfolio is currently idle.</td>
                            </tr>
                        ) : (
                            open_trades.map(trade => {
                                const pnl = parseFloat(trade.unrealized_pnl || 0);
                                const pnlPerc = (pnl / (trade.entry_price * trade.quantity)) * 100;
                                return (
                                    <tr key={trade.id} className="table-row group">
                                        <td className="table-cell">
                                            <div className="flex flex-col">
                                                <span className="font-black text-gray-900">{trade.stock_symbol}</span>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">NSE INDIA</span>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${trade.trade_type === 'BUY' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                                {trade.trade_type}
                                            </span>
                                        </td>
                                        <td className="table-cell font-bold text-gray-700">{trade.quantity}</td>
                                        <td className="table-cell text-gray-600 font-medium">₹{parseFloat(trade.entry_price).toFixed(1)}</td>
                                        <td className="table-cell font-bold">
                                            {trade.current_price ? `₹${parseFloat(trade.current_price).toFixed(1)}` : 'Syncing...'}
                                        </td>
                                        <td className="table-cell text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`font-black ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                                                </span>
                                                <span className={`text-[10px] font-bold ${pnlPerc >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    ({pnlPerc >= 0 ? '+' : ''}{pnlPerc.toFixed(2)}%)
                                                </span>
                                            </div>
                                        </td>
                                        <td className="table-cell text-center">
                                            <button 
                                                disabled={closing === trade.id}
                                                onClick={() => handleCloseTrade(trade.id)}
                                                className="btn btn-outline border-danger/30 text-danger hover:bg-danger hover:text-white py-1 px-4 text-xs font-black shadow-sm"
                                            >
                                                {closing === trade.id ? 'Settling...' : 'EXIT'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* ── Trade History ── */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            Closed Positions & History
        </h2>
        <div className="card p-0 overflow-hidden border-gray-100 opacity-90 grayscale-[0.3] hover:grayscale-0 transition-all">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="table-header">Symbol</th>
                            <th className="table-header">Type</th>
                            <th className="table-header">Qty</th>
                            <th className="table-header text-right">Net P&L</th>
                            <th className="table-header">Entry → Exit</th>
                            <th className="table-header text-right">Closed At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {trade_history.map(t => (
                            <tr key={t.id} className="table-row">
                                <td className="table-cell font-bold">{t.stock_symbol}</td>
                                <td className="table-cell">
                                    <span className={`text-[10px] font-bold ${t.trade_type === 'BUY' ? 'text-success' : 'text-danger'}`}>
                                        {t.trade_type}
                                    </span>
                                </td>
                                <td className="table-cell font-medium">{t.quantity}</td>
                                <td className="table-cell text-right font-bold underline decoration-2 decoration-gray-100">
                                    <span className={parseFloat(t.pnl) >= 0 ? 'text-success' : 'text-danger'}>
                                        ₹{parseFloat(t.pnl).toFixed(1)}
                                    </span>
                                </td>
                                <td className="table-cell text-xs font-medium text-gray-500">
                                    ₹{parseFloat(t.entry_price).toFixed(1)} → ₹{parseFloat(t.exit_price).toFixed(1)}
                                </td>
                                <td className="table-cell text-right text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                    {new Date(t.closed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;
