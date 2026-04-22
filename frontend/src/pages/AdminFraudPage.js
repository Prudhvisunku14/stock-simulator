import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { 
  ShieldAlert, 
  UserX, 
  Send, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Search,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const AdminFraudPage = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionStatus, setActionStatus] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getFraudUsers();
      if (res.data.success) {
        setUsers(res.data.data);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch fraud data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWarn = async (userId, email) => {
    try {
      const msg = window.prompt(`Enter warning message for ${email}:`, 'Your account has been flagged for unusual trading activity. Multiple orders detected in a short time.');
      if (msg === null) return;

      await adminAPI.sendWarning({ user_id: userId, message: msg });
      showStatus('Warning sent successfully');
    } catch (err) {
      showStatus('Failed to send warning', 'error');
    }
  };

  const handleToggleDisable = async (userId, isDisabled) => {
    try {
      const confirmMsg = isDisabled ? 'Re-enable this user?' : 'Block this user from logging in?';
      if (!window.confirm(confirmMsg)) return;

      await adminAPI.disableUser({ user_id: userId, disable: !isDisabled });
      showStatus(isDisabled ? 'User re-enabled' : 'User disabled');
      fetchData();
    } catch (err) {
      showStatus('Action failed', 'error');
    }
  };

  const showStatus = (text, type = 'success') => {
    setActionStatus({ text, type });
    setTimeout(() => setActionStatus(null), 3000);
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(filter.toLowerCase()) || 
    u.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-2xl text-red-600">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Fraud Detection</h1>
            <p className="text-gray-500 font-medium">Real-time behavioral outlier detection and risk mitigation.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter users..." 
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 shadow-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-primary transition-colors shadow-sm">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {actionStatus && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border animate-in slide-in-from-top-2 ${actionStatus.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          {actionStatus.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span className="text-sm font-bold">{actionStatus.text}</span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-l-4 border-red-500">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Flagged Users</p>
          <h3 className="text-3xl font-black text-gray-900">{stats?.total_flagged || 0}</h3>
          <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1">
             <TrendingUp size={12} /> +12% from last week
          </p>
        </div>
        <div className="card p-6 border-l-4 border-amber-500">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Average Risk Score</p>
          <h3 className="text-3xl font-black text-gray-900">{stats?.avg_risk?.toFixed(1) || 0}</h3>
          <p className="text-xs text-amber-500 font-bold mt-2">Moderate System Sensitivity</p>
        </div>
        <div className="card p-6 border-l-4 border-primary">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total System Balance</p>
          <h3 className="text-3xl font-black text-gray-900">₹{(users.reduce((acc, u) => acc + parseFloat(u.balance), 0)/1000000).toFixed(1)}M</h3>
          <p className="text-xs text-emerald-500 font-bold mt-2">At-risk Exposure: Low</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Distribution Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-primary" size={20} />
              Risk Distribution
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={users}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} hide />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip 
                  cursor={{fill: '#F9FAFB'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="risk_score" radius={[6, 6, 0, 0]} barSize={32}>
                  {users.map((entry, index) => (
                    <Cell key={index} fill={entry.risk_score > 80 ? '#EF4444' : entry.risk_score > 60 ? '#F59E0B' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Flags Quick List */}
        <div className="card p-6">
          <h3 className="text-lg font-black text-gray-900 mb-6">Top Flags</h3>
          <div className="space-y-4">
            {users.slice(0, 5).map(u => (
              <div key={u.id} className="p-4 bg-gray-50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">{u.email}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${u.risk_score > 80 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    SCORE: {u.risk_score}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {u.flags.slice(0, 2).map((flag, i) => (
                    <span key={i} className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100">
                      {flag.split(' (')[0]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
          <h3 className="text-lg font-black text-gray-900">Flagged Accounts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Risk Score</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Reasoning / Flags</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`group hover:bg-gray-50/80 transition-colors ${user.is_disabled ? 'opacity-60 bg-gray-100/50' : ''}`}>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-gray-900 flex items-center gap-2">
                        {user.name}
                        {user.is_disabled && <span className="bg-red-500 h-1.5 w-1.5 rounded-full"></span>}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden max-w-[100px]">
                        <div 
                          className={`h-full rounded-full ${user.risk_score > 80 ? 'bg-red-500' : user.risk_score > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${user.risk_score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-black ${user.risk_score > 80 ? 'text-red-600' : 'text-gray-900'}`}>{user.risk_score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      {user.flags.map((flag, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                          <AlertTriangle size={12} className={user.risk_score > 80 ? 'text-red-400' : 'text-amber-400'} />
                          {flag}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleWarn(user.id, user.email)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Send Warning"
                      >
                        <Send size={18} />
                      </button>
                      <button 
                        onClick={() => handleToggleDisable(user.id, user.is_disabled)}
                        className={`p-2 rounded-lg transition-all ${user.is_disabled ? 'text-emerald-500 bg-emerald-50' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                        title={user.is_disabled ? 'Enable User' : 'Disable User'}
                      >
                        <UserX size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-400 font-bold">
                    No suspicious users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminFraudPage;
