import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { 
  Settings, 
  Bell, 
  Shield, 
  User as UserIcon, 
  Database, 
  Zap,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const SettingsPage = ({ user }) => {
  const [globalAlerts, setGlobalAlerts] = useState(user.receive_global_alerts || false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const handleToggle = async () => {
    const newValue = !globalAlerts;
    setGlobalAlerts(newValue);
    setSaving(true);
    setStatus(null);

    try {
      await authAPI.updateSettings({ receive_global_alerts: newValue });
      
      // Update local storage
      const updatedUser = { ...user, receive_global_alerts: newValue };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setStatus({ type: 'success', text: 'Settings updated successfully' });
    } catch (err) {
      console.error('Settings update failed:', err);
      setGlobalAlerts(!newValue);
      setStatus({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Settings className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account Settings</h1>
          <p className="text-gray-500 font-medium">Manage your trading preferences and notification rules.</p>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top-2 duration-300 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{status.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Navigation Tabs */}
        <div className="space-y-2">
          {[
            { name: 'General', icon: UserIcon, active: true },
            { name: 'Notifications', icon: Bell, active: false },
            { name: 'Security', icon: Shield, active: false },
            { name: 'Data & Privacy', icon: Database, active: false },
          ].map(tab => (
            <button 
              key={tab.name}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${tab.active ? 'bg-white shadow-sm text-primary border border-gray-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Right: Content Area */}
        <div className="md:col-span-2 space-y-6">
          <section className="card p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
               <Bell className="w-5 h-5 text-primary" />
               <h2 className="text-lg font-black text-gray-900">Notification Rules</h2>
            </div>

            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-900">Enable Global Pattern Alerts</p>
                <p className="text-xs text-gray-500 font-medium max-w-sm">Receive real-time notifications for high-confidence ML patterns across all active stocks, even if they aren't in your watchlist.</p>
              </div>
              <button 
                onClick={handleToggle}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${globalAlerts ? 'bg-primary' : 'bg-gray-200'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalAlerts ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-900">Price Threshold Alerts</p>
                <p className="text-xs text-gray-500 font-medium">Get notified when a stock reaches a specific price point.</p>
              </div>
              <div className="h-6 w-11 bg-gray-100 rounded-full flex items-center px-1">
                <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-900">Email Digest</p>
                <p className="text-xs text-gray-500 font-medium">Weekly summary of your trading performance.</p>
              </div>
              <div className="h-6 w-11 bg-gray-100 rounded-full flex items-center px-1">
                <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </section>

          <section className="card p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
               <Zap className="w-5 h-5 text-warning" />
               <h2 className="text-lg font-black text-gray-900">Strategy Preferences</h2>
            </div>
            
            <div className="space-y-4">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confidence Threshold</p>
               <input 
                type="range" 
                min="50" 
                max="95" 
                defaultValue="70"
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-not-allowed opacity-50"
               />
               <div className="flex justify-between text-[10px] font-black text-gray-400">
                  <span>50%</span>
                  <span>70% (Default)</span>
                  <span>95%</span>
               </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
