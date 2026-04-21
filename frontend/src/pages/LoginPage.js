import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { 
  TrendingUp, 
  Smartphone, 
  Lock, 
  ChevronRight, 
  ShieldCheck, 
  Globe, 
  PieChart,
  Activity
} from 'lucide-react';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(email, password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex">
      {/* ── Left Side: Visual/Branding ── */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden items-center justify-center p-20">
         <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary p-2.5 rounded-2xl">
                    <TrendingUp className="text-white w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">StockSim</h1>
            </div>
            
            <h2 className="text-5xl font-black text-white leading-tight mb-8">
                Master the Markets without the <span className="text-primary italic">Risk.</span>
            </h2>
            
            <div className="space-y-6">
                {[
                    { icon: PieChart, title: 'Portfolio Management', desc: 'Track your holdings with institutional-grade analytics.' },
                    { icon: Activity, title: 'Real-time Execution', desc: 'Zero-latency order processing simulation.' },
                    { icon: ShieldCheck, title: 'Safe Environment', desc: 'Perfect your strategy with ₹1,00,000 virtual capital.' }
                ].map((item, i) => (
                    <div key={i} className="flex gap-4 group animate-in slide-in-from-left-4 duration-700" style={{ animationDelay: `${i * 150}ms` }}>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/20 transition-all">
                            <item.icon className="text-primary w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-white text-lg">{item.title}</p>
                            <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
         </div>

         {/* Abstract background shapes */}
         <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-primary/10 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-50px] right-[-50px] w-96 h-96 bg-primary/5 rounded-full blur-[100px]"></div>
      </div>

      {/* ── Right Side: Login Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md space-y-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center lg:text-left">
                  <div className="lg:hidden flex justify-center mb-6">
                    <div className="bg-primary p-2 rounded-xl">
                        <TrendingUp className="text-white w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 mb-2">Login</h3>
                  <p className="text-gray-500 font-medium">Safe, SECURE, virtual trading access.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative group">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                          <input 
                            type="email" 
                            className="input pl-12 py-4 rounded-2xl font-bold bg-white" 
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Security PIN / Password</label>
                      <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                          <input 
                            type="password" 
                            className="input pl-12 py-4 rounded-2xl font-bold bg-white" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                      </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold animate-in shake-in">
                        {error}
                    </div>
                  )}

                  <button 
                    disabled={loading}
                    className="w-full py-4 bg-primary hover:bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50"
                  >
                      {loading ? 'Authenticating...' : 'ACCESS PLATFORM'}
                      {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </button>
              </form>
              
              <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">
                    Don't have an account? {' '}
                    <button 
                      onClick={() => window.location.href = '/signup'} 
                      className="text-primary font-bold hover:underline"
                    >
                      Sign up for free
                    </button>
                  </p>
              </div>
              
              <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3" /> System Ver. 2.4.0
                  </div>
                  <div className="flex items-center gap-4">
                      <span className="hover:text-primary cursor-pointer transition-colors">Support</span>
                      <span className="hover:text-primary cursor-pointer transition-colors">Privacy</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default LoginPage;
