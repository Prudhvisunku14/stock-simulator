import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { tradesAPI, stocksAPI } from '../services/api';
import TransactionPopup from '../components/TransactionPopup';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock, 
  ShieldCheck, 
  Info,
  ArrowRight,
  Calculator,
  ArrowLeft
} from 'lucide-react';

const TradePage = ({ user }) => {
  const { symbol: urlSymbol } = useParams();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');

  const [form, setForm] = useState({
    stock_symbol: urlSymbol || '',
    trade_type: typeParam === 'SELL' ? 'SELL' : 'BUY',
    quantity: 1,
    stop_loss: '',
    target_price: '',
  });

  const [currentPrice, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [error, setError] = useState('');
  const [availableStocks, setAvailableStocks] = useState([]);

  useEffect(() => {
    if (form.stock_symbol) fetchPrice();
  }, [form.stock_symbol]);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await stocksAPI.getAll();
        if (res.data && res.data.data) {
          setAvailableStocks(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load stocks', err);
      }
    };
    fetchStocks();
  }, []);

  const fetchPrice = async () => {
    try {
      const res = await stocksAPI.getMarketData(form.stock_symbol, '1d', 1);
      const data = res.data.data;
      if (data && data.length > 0) {
        setPrice(parseFloat(data[data.length-1].close_price || data[data.length-1].close));
      } else {
        setPrice(null);
      }
    } catch { 
        setPrice(null); 
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const estimatedCost = currentPrice ? (currentPrice * parseInt(form.quantity || 0)) : 0;
  const isAffordable = form.trade_type === 'SELL' || estimatedCost <= parseFloat(user.balance);

  const handlePlaceTrade = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const tradeData = {
        stock_symbol: form.stock_symbol.toUpperCase(),
        trade_type: form.trade_type,
        quantity: parseInt(form.quantity),
        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
        target_price: form.target_price ? parseFloat(form.target_price) : null,
      };

      const res = await tradesAPI.place(tradeData);

      if (res.data.success) {
        setPopupData({
            symbol: form.stock_symbol.toUpperCase(),
            quantity: form.quantity,
            price: currentPrice,
            total: estimatedCost
        });
        setShowPopup(true);
        setForm(prev => ({ ...prev, quantity: 1, stop_loss: '', target_price: '' }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction failed. Please check your balance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <TransactionPopup 
        isOpen={showPopup} 
        onClose={() => setShowPopup(false)} 
        data={popupData} 
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
             <TrendingUp className="w-8 h-8 text-primary" />
             Execute Trade
           </h1>
           <p className="text-sm font-medium text-gray-500 uppercase tracking-widest text-[10px]">Real-time Order Management System</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Trade Form ── */}
        <div className="lg:col-span-2">
            <div className="card shadow-xl border-gray-100 overflow-hidden p-0">
                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Entry Form</span>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                        <span className="text-[10px] font-black text-success uppercase">Feed Active</span>
                    </div>
                </div>
                
                <form onSubmit={handlePlaceTrade} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Instrument Symbol</label>
                            <input 
                                className="input uppercase font-bold text-lg" 
                                name="stock_symbol" 
                                list="stock-options"
                                value={form.stock_symbol}
                                onChange={(e) => setForm({...form, stock_symbol: e.target.value.toUpperCase()})}
                                onBlur={fetchPrice}
                                placeholder="e.g. RELIANCE" 
                                required 
                            />
                            <datalist id="stock-options">
                                {availableStocks.map(stock => (
                                    <option key={stock.symbol} value={stock.symbol}>
                                        {stock.company_name || stock.symbol}
                                    </option>
                                ))}
                            </datalist>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Order Type</label>
                            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                                {['BUY', 'SELL'].map(type => (
                                    <button 
                                        key={type} 
                                        type="button"
                                        onClick={() => setForm({ ...form, trade_type: type })}
                                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${form.trade_type === type ? (type === 'BUY' ? 'bg-success text-white shadow-md' : 'bg-danger text-white shadow-md') : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {type === 'BUY' ? 'BUY' : 'SELL'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Quantity</label>
                            <input 
                                className="input font-bold" 
                                name="quantity" 
                                type="number"
                                value={form.quantity} 
                                onChange={handleChange} 
                                min={1} 
                                required 
                            />
                        </div>
                        <div className="space-y-2 text-center md:pt-8">
                             <ArrowLeft className="w-5 h-5 mx-auto text-gray-300 hidden md:block rotate-180" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Value</label>
                            <div className="px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100 font-bold text-gray-900 border-dashed">
                                ₹{estimatedCost.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50 mt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                Stop Loss <ShieldCheck className="w-3 h-3 text-gray-300" />
                            </label>
                            <input 
                                className="input" 
                                name="stop_loss" 
                                type="number"
                                value={form.stop_loss} 
                                onChange={handleChange} 
                                placeholder="₹ Trigger price" 
                                step="0.01" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                Take Profit <TrendingUp className="w-3 h-3 text-gray-300" />
                            </label>
                            <input 
                                className="input" 
                                name="target_price" 
                                type="number"
                                value={form.target_price} 
                                onChange={handleChange} 
                                placeholder="₹ Exit price" 
                                step="0.01" 
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-start gap-3">
                            <Info className="w-5 h-5 mt-0.5" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <button 
                        disabled={loading || !currentPrice || !isAffordable}
                        className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all active:scale-[0.98] ${form.trade_type === 'BUY' ? 'bg-success hover:bg-emerald-600 shadow-emerald-100' : 'bg-danger hover:bg-red-600 shadow-red-100'} disabled:bg-gray-200 disabled:shadow-none disabled:cursor-not-allowed`}
                    >
                        {loading ? 'Processing Order...' : `${form.trade_type === 'BUY' ? 'PLACE BUY' : 'PLACE SELL'} ORDER`}
                    </button>
                    {!isAffordable && <p className="text-center text-xs font-bold text-danger">Insufficient balance for this transaction.</p>}
                </form>
            </div>
        </div>

        {/* ── Sidebar: Order Summary ── */}
        <div className="space-y-6">
            <div className="card bg-gray-900 text-white border-none shadow-2xl relative overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Available Balance</span>
                        </div>
                        <h2 className="text-2xl font-black">₹{parseFloat(user.balance || 0).toLocaleString()}</h2>
                    </div>
                </div>
                <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all"></div>
            </div>

            <div className="card border-gray-100 shadow-sm p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Order Totals</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-gray-500">Execution Price</span>
                        <span className="text-gray-900 font-bold">{currentPrice ? `₹${currentPrice.toLocaleString()}` : 'Detecting...'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-gray-500">Brokerage (0.01%)</span>
                        <span className="text-gray-900 font-bold">₹0.00 (Promo)</span>
                    </div>
                    <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                        <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Payable</span>
                             <span className="text-xl font-black text-gray-900">₹{estimatedCost.toLocaleString()}</span>
                        </div>
                        <div className={`p-1 w-6 h-6 rounded-lg flex items-center justify-center ${isAffordable ? 'bg-emerald-50 text-success' : 'bg-red-50 text-danger'}`}>
                             {isAffordable ? <ShieldCheck className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 relative overflow-hidden">
                <div className="relative z-10">
                    <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Market Schedule
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">Market is currently open for paper trading. Trades will be executed instantly at the current LTP.</p>
                </div>
                <TrendingUp className="absolute bottom-[-20px] left-[-20px] w-24 h-24 text-primary opacity-[0.05]" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default TradePage;
