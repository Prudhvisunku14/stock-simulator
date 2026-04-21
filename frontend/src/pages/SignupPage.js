// pages/SignupPage.js
// FIX: Added role selection (USER / ADMIN)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { 
  TrendingUp, 
  Smartphone, 
  Lock, 
  User,
  Mail,
  ChevronRight, 
  ShieldCheck, 
  Globe, 
  Shield,
  CheckCircle2
} from 'lucide-react';

const SignupPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    email: '',
    password: '',
    role: 'USER'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.signup(formData);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex">
      {/* ── Left Side: Branding ── */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden items-center justify-center p-20">
        <div className="relative z-10 max-w-lg text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary p-2.5 rounded-2xl">
              <TrendingUp className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">StockSim</h1>
          </div>
          
          <h2 className="text-5xl font-black leading-tight mb-8">
            Start with <span className="text-primary italic">₹1,00,000</span> virtual capital.
          </h2>
          
          <div className="space-y-6">
            {[
              { icon: CheckCircle2, title: 'Instant Account', desc: 'Get your virtual trading floor ready in seconds.' },
              { icon: ShieldCheck, title: 'Safe & Simulated', desc: 'No real money risk. Pure learning and strategy.' },
              { icon: Globe, title: 'ML Pattern Alerts', desc: 'AI detects chart patterns and notifies you in real-time.' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 group-hover:bg-primary/20 transition-all">
                  <item.icon className="text-primary w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-lg">{item.title}</p>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-50px] right-[-50px] w-96 h-96 bg-primary/5 rounded-full blur-[100px]"></div>
      </div>

      {/* ── Right Side: Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h3 className="text-4xl font-black text-gray-900 mb-2">Create Account</h3>
            <p className="text-gray-500 font-medium">Join thousands of virtual traders today.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                  name="name" type="text"
                  className="input pl-12 py-3 rounded-2xl font-bold bg-white w-full"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                  name="email" type="email"
                  className="input pl-12 py-3 rounded-2xl font-bold bg-white w-full"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
              <div className="relative group">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                  name="mobile_number" type="text"
                  className="input pl-12 py-3 rounded-2xl font-bold bg-white w-full"
                  placeholder="9988776655"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Create Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                  name="password" type="password"
                  className="input pl-12 py-3 rounded-2xl font-bold bg-white w-full"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Role Selection — NEW */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Role</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'USER',  label: 'Trader',         icon: User,   desc: 'Trade & analyze stocks' },
                  { value: 'ADMIN', label: 'Administrator',  icon: Shield, desc: 'Access admin analytics' }
                ].map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: value })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      formData.role === value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-2" />
                    <p className="font-black text-sm">{label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-4 bg-primary hover:bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'GET STARTED NOW'}
              {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary font-bold hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
