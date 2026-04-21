import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, LogOut, User, Menu, X, TrendingUp } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = ({ user, onLogout }) => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/stock/${search.toUpperCase()}`);
      setSearch('');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="bg-primary p-1.5 rounded-lg">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">StockSim</span>
        </Link>
        
        <form onSubmit={handleSearch} className="hidden md:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search stocks (e.g. RELIANCE)"
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64 lg:w-96 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex flex-col items-end mr-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Balance</span>
          <span className="text-sm font-bold text-success">
            ₹{parseFloat(user.balance || 100000).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

        <div className="flex items-center gap-2">
           <NotificationBell user={user} />
        </div>

        <div className="relative group ml-2">
          <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold truncate max-w-[100px]">{user.name || 'User'}</p>
            </div>
          </button>
          
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-premium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
            <div className="px-4 py-2 border-b border-gray-100 mb-1">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
            </div>
            <Link to="/portfolio" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <User className="w-4 h-4" /> Portfolio
            </Link>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors mt-1"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
