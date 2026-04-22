import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stocksAPI, mlAPI } from '../services/api';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  RefreshCw, 
  Cpu,
  ArrowLeft,
  Info,
  BarChart2
} from 'lucide-react';

const AnalysisPage = ({ user }) => {
  const { symbol: urlSymbol } = useParams();
  const navigate = useNavigate();
  
  const [candles, setCandles]         = useState([]);
  const [patterns, setPatterns]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [mlLoading, setMlLoading]     = useState(false);
  const [latestPattern, setLatestPat] = useState(null);
  const [symbol, setSymbol]           = useState(urlSymbol || 'TCS');
  const [timeframe, setTimeframe]     = useState('1d');
  const [error, setError]             = useState('');
  const [patternFilter, setPatternFilter] = useState('STRONG');

  const chartContainerRef = useRef(null);
  const tooltipRef = useRef(null);
  const chartInstance = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const groupedPatternsRef = useRef({});

  // Sync state with URL param if it changes
  useEffect(() => {
    if (urlSymbol && urlSymbol !== symbol) {
      setSymbol(urlSymbol);
    }
  }, [urlSymbol]);

  useEffect(() => {
    loadData();
  }, [symbol, timeframe]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [candleRes, patternRes] = await Promise.all([
        stocksAPI.getYahooMarketData(symbol, timeframe),
        mlAPI.getPatterns(symbol),
      ]);
      const fetchedCandles = candleRes.data.data || [];
      const sortedCandles = [...fetchedCandles].sort((a, b) => 
          new Date(a.timestamp || a.time).getTime() - new Date(b.timestamp || b.time).getTime()
      );
      setCandles(sortedCandles);
      setPatterns(patternRes.data.data || []);
    } catch (err) {
      setError('Error loading data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDetectPattern = async () => {
    setMlLoading(true);
    setError('');
    try {
      const res = await mlAPI.predict(symbol, 50);
      setLatestPat(res.data.data);
      loadData(); 
    } catch (err) {
      setError('ML Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setMlLoading(false);
    }
  };

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#f1f5f9',
      },
      timeScale: {
        borderColor: '#f1f5f9',
        timeVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // set as an overlay
    });

    volumeSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.8,
            bottom: 0,
        },
    });

    chartInstance.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstance.current) {
        chartInstance.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    chart.subscribeCrosshairMove(param => {
      if (!tooltipRef.current) return;
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        tooltipRef.current.style.display = 'none';
      } else {
        const pats = groupedPatternsRef.current[param.time];
        if (pats && pats.length > 0) {
          tooltipRef.current.style.display = 'flex';
          tooltipRef.current.style.left = param.point.x + 15 + 'px';
          // Offset tooltip to avoid falling off bottom edge
          tooltipRef.current.style.top = param.point.y > 300 ? (param.point.y - 80) + 'px' : param.point.y + 15 + 'px';
          
          tooltipRef.current.innerHTML = pats.map(p => {
             const isBuy = p.signal === 'BUY';
             const isSell = p.signal === 'SELL';
             const color = isBuy ? '#10b981' : isSell ? '#ef4444' : '#eab308';
             const icon = isBuy ? '▲' : isSell ? '▼' : '●';
             return `
               <div style="display: flex; align-items: center; gap: 8px;">
                 <span style="color: ${color}; font-size: 10px;">${icon}</span>
                 <span style="font-weight: 700; color: #1e293b;">${p.pattern_type}</span>
                 <span style="font-size: 10px; font-weight: 800; color: #64748b; margin-left: auto;">${Math.round(p.probability * 100)}%</span>
               </div>
             `;
          }).join('');
        } else {
          tooltipRef.current.style.display = 'none';
        }
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.remove();
        chartInstance.current = null;
      }
    };
  }, []);

  // Update Data
  useEffect(() => {
    if (candleSeriesRef.current && volumeSeriesRef.current && candles.length > 0) {
      const candleData = [];
      const volumeData = [];
      const seen = new Set();
      
      candles.forEach((c) => {
        const timeSecs = Math.floor(new Date(c.timestamp || c.time).getTime() / 1000);
        if (!seen.has(timeSecs)) {
          seen.add(timeSecs);
          const close = parseFloat(c.close || c.close_price);
          const open = parseFloat(c.open || c.open_price);
          
          candleData.push({
            time: timeSecs,
            open,
            high: parseFloat(c.high || c.high_price),
            low: parseFloat(c.low || c.low_price),
            close
          });

          volumeData.push({
            time: timeSecs,
            value: parseFloat(c.volume || 0),
            color: close >= open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
          });
        }
      });

      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
      
      const markers = [];
      const grouped = {};
      
      let visiblePats = [...patterns];
      if (patternFilter === 'HIDE') visiblePats = [];
      
      // Sort all patterns by probability highest first
      visiblePats.sort((a, b) => b.probability - a.probability);
      
      // Filter top 5 strong patterns if STRONG
      if (patternFilter === 'STRONG') {
          visiblePats = visiblePats.filter(p => p.probability >= 0.6).slice(0, 5);
      }

      visiblePats.forEach(p => {
        const pTime = Math.floor(new Date(p.end_time).getTime() / 1000);
        if (!grouped[pTime]) grouped[pTime] = [];
        grouped[pTime].push(p);
      });
      
      groupedPatternsRef.current = grouped;
      
      Object.keys(grouped).forEach(timeStr => {
         const time = parseInt(timeStr);
         const pats = grouped[timeStr];
         const best = pats[0]; // Already sorted by probability
         
         const isBuy = best.signal === 'BUY';
         const isSell = best.signal === 'SELL';
         const color = isBuy ? '#10b981' : isSell ? '#ef4444' : '#eab308';
         const shape = isBuy ? 'arrowUp' : isSell ? 'arrowDown' : 'circle';
         const icon = isBuy ? '▲' : isSell ? '▼' : '●';
         
         let text = `${icon} ${best.pattern_type} (${Math.round(best.probability * 100)}%)`;
         if (pats.length > 1) {
             text += ` +${pats.length - 1}`;
         }
         
         markers.push({
             time,
             position: isBuy ? 'belowBar' : 'aboveBar',
             color,
             shape,
             text,
             size: 0.8, // Reduced scale for text
         });
      });

      const sortedMarkers = markers.sort((a, b) => a.time - b.time);
      candleSeriesRef.current.setMarkers(sortedMarkers);
      chartInstance.current?.timeScale().fitContent();
    }
  }, [candles, patterns, patternFilter]);

  const latestPrice = candles.length > 0 ? parseFloat(candles[candles.length - 1].close || candles[candles.length - 1].close_price) : null;
  const firstPrice  = candles.length > 0 ? parseFloat(candles[0].close || candles[0].close_price) : null;
  const priceChange = latestPrice && firstPrice ? ((latestPrice - firstPrice) / firstPrice * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
             <ArrowLeft className="w-5 h-5 text-gray-500" />
           </button>
           <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                {symbol}
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded">NSE</span>
              </h1>
              <p className="text-sm text-gray-500">Yahoo Finance Real-time Analysis</p>
           </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                {['1m', '5m', '15m', '1d'].map(tf => (
                    <button 
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe === tf ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        {tf.toUpperCase()}
                    </button>
                ))}
            </div>
            <button onClick={loadData} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
          <Info className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card card-hover">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Last Traded Price</p>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                    {latestPrice ? `₹${latestPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '---'}
                </span>
                <span className={`text-xs font-bold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
            </div>
        </div>
        <div className="card card-hover">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Market Sentiment</p>
            <div className="flex items-center gap-2">
                {priceChange >= 0 ? (
                    <div className="flex items-center gap-1.5 text-success">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-bold">BULLISH</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-danger">
                        <TrendingDown className="w-5 h-5" />
                        <span className="text-sm font-bold">BEARISH</span>
                    </div>
                )}
            </div>
        </div>
        <div className="card card-hover">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Volume</p>
            <div className="flex items-center gap-2">
                <Activity className="text-primary w-5 h-5" />
                <span className="text-lg font-bold text-gray-900">
                    {candles.length > 0 ? (candles[candles.length-1].volume || 0).toLocaleString() : '---'}
                </span>
            </div>
        </div>
        <div className="card card-hover">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ML Status</p>
            <div className="flex items-center gap-2">
                <Cpu className="text-purple-500 w-5 h-5" />
                <span className="text-sm font-bold text-gray-900">ENGINE ACTIVE</span>
            </div>
        </div>
      </div>

      {/* ── Main Chart ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
            <div className="card p-0 overflow-hidden relative">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-primary" />
                        Advanced Candlestick Chart
                    </h3>
                    <div className="flex items-center gap-3">
                         <div className="flex bg-white rounded-md p-1 border border-gray-200">
                             <button onClick={() => setPatternFilter('ALL')} className={`px-2 py-1 text-[10px] font-bold rounded ${patternFilter === 'ALL' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>All Patterns</button>
                             <button onClick={() => setPatternFilter('STRONG')} className={`px-2 py-1 text-[10px] font-bold rounded ${patternFilter === 'STRONG' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Strong Only</button>
                             <button onClick={() => setPatternFilter('HIDE')} className={`px-2 py-1 text-[10px] font-bold rounded ${patternFilter === 'HIDE' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Hide</button>
                         </div>
                         <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-bold">LIVE</span>
                    </div>
                </div>
                
                <div className="p-2 relative">
                    <div ref={chartContainerRef} className="w-full relative min-h-[450px]">
                         <div 
                             ref={tooltipRef} 
                             className="absolute hidden z-50 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl rounded-xl p-3 text-sm flex-col gap-2 min-w-[200px] pointer-events-none transition-opacity duration-200"
                         ></div>
                    </div>
                </div>

                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <p className="text-sm font-bold text-gray-600">Updating Market Data...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Pattern History Table */}
            <div className="card">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Detected ML Patterns
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-y border-gray-100">
                                <th className="table-header">Type</th>
                                <th className="table-header">Probability</th>
                                <th className="table-header">Signal</th>
                                <th className="table-header">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {patterns.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-400 italic text-sm">No patterns detected for this period yet.</td>
                                </tr>
                            ) : (
                                patterns.map(p => (
                                    <tr key={p.id} className="table-row">
                                        <td className="table-cell font-bold text-gray-900">{p.pattern_type}</td>
                                        <td className="table-cell">
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${p.probability > 0.7 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${p.probability * 100}%` }} />
                                                </div>
                                                <span className="font-bold">{(p.probability * 100).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <span className={`badge ${p.signal === 'BUY' ? 'bg-success/10 text-success' : p.signal === 'SELL' ? 'bg-danger/10 text-danger' : 'bg-gray-100 text-gray-500'}`}>
                                                {p.signal}
                                            </span>
                                        </td>
                                        <td className="table-cell text-gray-500 text-xs">{new Date(p.created_at).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* ── Sidebar Panels ── */}
        <div className="space-y-6">
            {/* Quick Trade Action */}
            <div className="card border-primary/20 bg-blue-50/30">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Execute Quick Trade</h3>
                <div className="space-y-4">
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Market Price</p>
                            <p className="text-lg font-bold">₹{latestPrice?.toLocaleString()}</p>
                        </div>
                        <Activity className="w-5 h-5 text-primary opacity-20" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => navigate(`/trade/${symbol}?type=BUY`)} className="btn btn-success flex items-center justify-center gap-2">
                            <TrendingUp className="w-4 h-4" /> BUY
                        </button>
                        <button onClick={() => navigate(`/trade/${symbol}?type=SELL`)} className="btn btn-danger flex items-center justify-center gap-2">
                            <TrendingDown className="w-4 h-4" /> SELL
                        </button>
                    </div>
                </div>
            </div>

            {/* Pattern Detection Scanner */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Pattern Scanner</h3>
                    {mlLoading && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">Runs our proprietary rule-based and ML algorithms on the last 50 candles to identify potential breakouts.</p>
                <button 
                  disabled={mlLoading || loading}
                  onClick={handleDetectPattern}
                  className="w-full btn btn-primary flex items-center justify-center gap-2 group"
                >
                    <Cpu className={`w-4 h-4 ${mlLoading ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                    {mlLoading ? 'Processing Data...' : 'Scan for Patterns'}
                </button>

                {latestPattern && (
                    <div className="mt-4 p-4 rounded-xl border border-warning/20 bg-warning/5 animate-in slide-in-from-top-2">
                        <p className="text-[10px] font-bold text-warning uppercase tracking-widest mb-1">Last Scan Result</p>
                        <p className="text-base font-bold text-gray-900 mb-1">{latestPattern.pattern_type}</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">{(latestPattern.probability * 100).toFixed(1)}% Confidence</span>
                            <span className={`text-xs font-bold ${latestPattern.signal === 'BUY' ? 'text-success' : 'text-danger'}`}>{latestPattern.signal}</span>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="card bg-gray-900 text-white border-none shadow-premium relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-sm font-bold mb-2">Portfolio Insights</h3>
                    <p className="text-xs text-gray-400 mb-4">You have 0 open positions for {symbol}.</p>
                    <button onClick={() => navigate('/portfolio')} className="text-xs font-bold text-primary hover:text-blue-400 flex items-center gap-1">
                        Go to Portfolio <ArrowLeft className="w-3 h-3 rotate-180" />
                    </button>
                </div>
                <Activity className="absolute bottom-[-20px] right-[-20px] w-24 h-24 text-white opacity-[0.03]" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
