// pages/AdminAnalyticsPage.js
// Full admin dashboard with charts, tables, command center
// Uses BASE_URL so it works with the existing api.js setup

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import {
  Users, TrendingUp, Activity, Zap, RefreshCcw, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Bell, ShieldCheck, DollarSign,
  BarChart2, PieChart as PieIcon, Briefcase, ChevronRight, Settings
} from 'lucide-react';
import api from '../services/api';

const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316'];

// ── Sub-components ────────────────────────────────────────────────────────────

const KpiCard = ({ title, value, sub, icon: Icon, trend, color = 'blue', loading }) => {
  const colors = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    indigo:  'bg-indigo-50 text-indigo-600',
    rose:    'bg-rose-50 text-rose-600',
  };
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <p className="text-2xl font-black text-gray-900">{value}</p>
      )}
      {sub && <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, color = 'text-gray-700' }) => (
  <div className={`flex items-center gap-2 mb-5 ${color}`}>
    <Icon className="w-5 h-5" />
    <h3 className="text-base font-black">{title}</h3>
  </div>
);

const Skeleton = ({ h = 'h-80' }) => (
  <div className={`${h} bg-gray-50 rounded-2xl animate-pulse`} />
);

// ── Custom Tooltip ────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-3 text-xs">
      <p className="font-black text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const AdminAnalyticsPage = ({ user }) => {
  const [data, setData] = useState({
    summary: null, users: null, trades: null,
    sectors: null, stocks: null, alerts: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Stock control form state
  const [ctrlSymbol, setCtrlSymbol]   = useState('');
  const [ctrlPrice, setCtrlPrice]     = useState('');
  const [ctrlStatus, setCtrlStatus]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, users, trades, sectors, stocks, alerts] = await Promise.all([
        api.get('/admin/analytics/summary'),
        api.get('/admin/analytics/users'),
        api.get('/admin/analytics/trades'),
        api.get('/admin/analytics/sectors'),
        api.get('/admin/analytics/stocks'),
        api.get('/admin/analytics/alerts'),
      ]);

      setData({
        summary: summary.data.data,
        users:   users.data.data,
        trades:  trades.data.data,
        sectors: sectors.data.data,
        stocks:  stocks.data.data,
        alerts:  alerts.data.data,
      });
    } catch (err) {
      console.error('Admin fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load analytics. Check admin privileges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStockControl = async (action) => {
    if (!ctrlSymbol) return;
    setCtrlStatus({ type: 'loading', text: 'Processing...' });
    try {
      await api.post('/admin/stocks/control', {
        symbol: ctrlSymbol,
        price: ctrlPrice ? parseFloat(ctrlPrice) : undefined,
        action
      });
      setCtrlStatus({ type: 'success', text: `✅ ${action === 'spike' ? 'Spike injected' : 'Price updated'} for ${ctrlSymbol}` });
      setCtrlSymbol(''); setCtrlPrice('');
      setTimeout(() => setCtrlStatus(null), 3000);
    } catch (e) {
      setCtrlStatus({ type: 'error', text: e.response?.data?.message || 'Failed' });
    }
  };

  // ── Error state ───────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-10 rounded-3xl border border-red-100 shadow-xl text-center max-w-sm">
          <AlertTriangle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-800 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button onClick={fetchAll} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Derived data
  const sectorPieData = data.sectors
    ? Object.entries(data.sectors).map(([name, v]) => ({ name, value: v.trades })).filter(d => d.value > 0)
    : [];

  const buySellData = data.trades
    ? [
        { name: 'BUY',  value: data.trades.buy_count  },
        { name: 'SELL', value: data.trades.sell_count },
      ]
    : [];

  const tabs = ['overview', 'traders', 'patterns', 'controls'];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ── Top Header ── */}
      <div className="bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Admin Analytics</h1>
            <p className="text-xs text-gray-400 font-medium">Logged in as {user?.name || 'Admin'}</p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Tab Nav ── */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-black capitalize transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ════════════════════ OVERVIEW TAB ════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard loading={loading} title="Total Users"  value={data.summary?.total_users?.toLocaleString() || '—'}   icon={Users}      color="blue"    />
              <KpiCard loading={loading} title="Total Trades" value={data.summary?.total_trades?.toLocaleString() || '—'}  icon={Activity}   color="indigo"  />
              <KpiCard loading={loading} title="Open Trades"  value={data.summary?.open_trades?.toLocaleString() || '—'}   icon={BarChart2}  color="amber"   />
              <KpiCard loading={loading} title="Total P&L"    value={data.summary ? `₹${data.summary.total_pnl?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'} icon={DollarSign} color="emerald" />
              <KpiCard loading={loading} title="Alerts Today" value={data.summary?.alerts_today?.toLocaleString() || '—'} icon={Bell}       color="rose"    />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Trades Bar */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={Activity} title="Daily Trades (Last 30 days)" />
                {loading ? <Skeleton /> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.trades?.daily_trades?.slice().reverse() || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={v => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="trades" fill="#3b82f6" radius={[4,4,0,0]} name="Trades" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Monthly Area */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={TrendingUp} title="Monthly Growth Trend" color="text-emerald-600" />
                {loading ? <Skeleton /> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trades?.monthly_trades || []}>
                        <defs>
                          <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="trades" stroke="#10b981" strokeWidth={2.5} fill="url(#gradGreen)" name="Trades" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Sector + Buy/Sell Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sector Pie */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={PieIcon} title="Sector Distribution" color="text-indigo-600" />
                {loading ? <Skeleton h="h-64" /> : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sectorPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                          {sectorPieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Buy vs Sell Pie */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={BarChart2} title="Buy vs Sell Ratio" />
                {loading ? <Skeleton h="h-64" /> : (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={buySellData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                            <Cell fill="#10b981" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                        BUY: {data.trades?.buy_count?.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-red-500">
                        <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                        SELL: {data.trades?.sell_count?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Trade Flow Stats */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={Zap} title="Trade Flow" color="text-amber-600" />
                {loading ? <Skeleton h="h-64" /> : (
                  <div className="space-y-5 mt-2">
                    {[
                      { label: 'Open Trades',     value: data.trades?.flow?.open_trades,          color: 'bg-blue-500' },
                      { label: 'Closed Trades',   value: data.trades?.flow?.closed_trades,        color: 'bg-emerald-500' },
                      { label: 'Avg Hold (hrs)',  value: data.trades?.flow?.avg_holding_time_hours, color: 'bg-amber-500' },
                      { label: 'Total P&L (₹)',   value: data.trades?.total_pnl?.toLocaleString('en-IN', { maximumFractionDigits: 0 }), color: data.trades?.total_pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                          <span className="text-sm font-medium text-gray-600">{item.label}</span>
                        </div>
                        <span className="font-black text-gray-900 text-sm">{item.value ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ TRADERS TAB ════════════════════ */}
        {activeTab === 'traders' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Traders Table */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={Users} title="Most Active Traders" color="text-blue-600" />
                {loading ? <Skeleton /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left">
                          <th className="pb-3 text-xs font-black text-gray-400 uppercase tracking-wider">#</th>
                          <th className="pb-3 text-xs font-black text-gray-400 uppercase tracking-wider">Name</th>
                          <th className="pb-3 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Trades</th>
                          <th className="pb-3 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(data.users?.most_active_users || []).map((u, i) => {
                          const max = data.users.most_active_users[0]?.trades || 1;
                          return (
                            <tr key={u.user_id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 text-gray-400 font-bold">{i+1}</td>
                              <td className="py-3 font-bold text-gray-800">{u.name}</td>
                              <td className="py-3 text-right font-black text-blue-600">{u.trades}</td>
                              <td className="py-3 text-right">
                                <div className="w-20 h-1.5 bg-gray-100 rounded-full ml-auto overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(u.trades/max)*100}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Time Distribution */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={Activity} title="Trading Time Distribution" />
                {loading ? <Skeleton /> : (() => {
                  const td = data.users?.time_distribution || {};
                  const tdData = [
                    { name: '🌅 Morning',   value: td.morning   || 0, fill: '#f59e0b' },
                    { name: '☀️ Afternoon', value: td.afternoon || 0, fill: '#3b82f6' },
                    { name: '🌆 Evening',   value: td.evening   || 0, fill: '#8b5cf6' },
                    { name: '🌙 Night',     value: td.night     || 0, fill: '#1e293b' },
                  ];
                  const total = tdData.reduce((s, d) => s + d.value, 0) || 1;
                  return (
                    <div className="space-y-4 mt-2">
                      {tdData.map((d, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-medium text-gray-600">{d.name}</span>
                            <span className="font-black text-gray-900">{d.value.toLocaleString()} <span className="text-gray-400 font-normal text-xs">({((d.value/total)*100).toFixed(0)}%)</span></span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.value/total)*100}%`, background: d.fill }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Stock Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={ArrowUpRight} title="Most Profitable Symbols" color="text-emerald-600" />
                {loading ? <Skeleton h="h-56" /> : (
                  <div className="space-y-3">
                    {(data.stocks?.most_profitable || []).map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-xl">
                        <span className="font-black text-gray-800 text-sm">{s.symbol}</span>
                        <span className="text-emerald-600 font-black text-sm">
                          {s.profit >= 0 ? '+' : ''}₹{Math.abs(s.profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                    {!data.stocks?.most_profitable?.length && <p className="text-gray-400 text-sm text-center py-8">No closed trades yet</p>}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={ArrowDownRight} title="Highest Loss Symbols" color="text-rose-600" />
                {loading ? <Skeleton h="h-56" /> : (
                  <div className="space-y-3">
                    {(data.stocks?.most_loss || []).map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 bg-rose-50 rounded-xl">
                        <span className="font-black text-gray-800 text-sm">{s.symbol}</span>
                        <span className="text-rose-600 font-black text-sm">
                          ₹{Math.abs(s.profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                    {!data.stocks?.most_loss?.length && <p className="text-gray-400 text-sm text-center py-8">No closed trades yet</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ PATTERNS TAB ════════════════════ */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            {/* Alert KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard loading={loading} title="Total Global Alerts" value={data.alerts?.total_alerts?.toLocaleString() || '—'} icon={Bell} color="indigo" />
              <KpiCard loading={loading} title="Avg Confidence"      value={data.alerts ? `${(data.alerts.avg_success_rate * 100).toFixed(1)}%` : '—'} icon={Zap} color="amber" />
              <KpiCard loading={loading} title="Notifs (Unread)"     value={data.alerts ? `${data.alerts.notification_stats?.unread} / ${data.alerts.notification_stats?.total_notifications}` : '—'} icon={AlertTriangle} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Patterns Bar */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={BarChart2} title="Most Detected Patterns" color="text-indigo-600" />
                {loading ? <Skeleton /> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.alerts?.top_patterns || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="pattern_type" type="category" tick={{ fontSize: 10 }} width={130} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" radius={[0,4,4,0]} name="Detections">
                          {(data.alerts?.top_patterns || []).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Recent Alerts Table */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={Bell} title="Recent Global Alerts" />
                {loading ? <Skeleton /> : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {(data.alerts?.recent_alerts || []).map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.signal === 'BUY' ? 'bg-emerald-500' : a.signal === 'SELL' ? 'bg-red-500' : 'bg-gray-400'}`} />
                          <div>
                            <p className="font-black text-gray-800">{a.symbol}</p>
                            <p className="text-gray-500">{a.pattern}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${a.signal === 'BUY' ? 'text-emerald-600' : a.signal === 'SELL' ? 'text-red-500' : 'text-gray-500'}`}>{a.signal}</p>
                          <p className="text-gray-400">{(a.confidence*100).toFixed(0)}%</p>
                        </div>
                      </div>
                    ))}
                    {!data.alerts?.recent_alerts?.length && <p className="text-gray-400 text-sm text-center py-8">No alerts yet — alert engine is scanning</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ CONTROLS TAB ════════════════════ */}
        {activeTab === 'controls' && (
          <div className="space-y-6">
            <div className="bg-gray-900 text-white rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/10 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="w-6 h-6 text-amber-400" />
                  <h2 className="text-xl font-black">Admin Command Center</h2>
                </div>
                <p className="text-gray-400 text-sm mb-8">Override market parameters and inject volatility into the simulation.</p>

                {/* Stock Price Control */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-black text-base mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-400" /> Manual Stock Control
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Stock Symbol</label>
                      <input
                        value={ctrlSymbol}
                        onChange={e => setCtrlSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g. RELIANCE"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm font-bold focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1.5">New Price (₹)</label>
                      <input
                        type="number"
                        value={ctrlPrice}
                        onChange={e => setCtrlPrice(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm font-bold focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <button
                        onClick={() => handleStockControl('set')}
                        disabled={!ctrlSymbol}
                        className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        Set Price <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStockControl('spike')}
                        disabled={!ctrlSymbol}
                        className="py-2.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-black rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        ⚡ Inject Spike
                      </button>
                    </div>
                  </div>

                  {ctrlStatus && (
                    <div className={`p-3 rounded-xl text-sm font-bold ${
                      ctrlStatus.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                      ctrlStatus.type === 'error'   ? 'bg-red-500/20 text-red-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {ctrlStatus.text}
                    </div>
                  )}
                </div>

                {/* Info panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <TrendingUp className="w-6 h-6 text-emerald-400 mb-3" />
                    <h4 className="font-black mb-1">Volatility Engine</h4>
                    <p className="text-sm text-gray-400 mb-3">Alert engine scans every 30s. Lower confidence threshold to 0.5 for more alerts.</p>
                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Running
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <Bell className="w-6 h-6 text-indigo-400 mb-3" />
                    <h4 className="font-black mb-1">Notification Stats</h4>
                    <p className="text-sm text-gray-400 mb-3">
                      {data.alerts ? `${data.alerts.notification_stats?.total_notifications} total notifications, ${data.alerts.notification_stats?.last_24h} in last 24h` : 'Loading...'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" /> WebSocket Active
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
