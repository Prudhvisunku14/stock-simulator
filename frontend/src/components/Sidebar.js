import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Briefcase, 
  BarChart2, 
  Bell, 
  Layers,
  Search,
  Shield,
  Settings
} from 'lucide-react';

const Sidebar = ({ user }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Markets', path: '/markets', icon: Layers },
    { name: 'Analysis', path: '/analysis', icon: BarChart2 },
    { name: 'Portfolio', path: '/portfolio', icon: Briefcase },
    { name: 'Trade', path: '/trade', icon: TrendingUp },
    { name: 'Alerts', path: '/alerts', icon: Bell },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const adminItem = { name: 'Admin', path: '/admin', icon: Shield };
  const displayItems = user && user.role === 'ADMIN' ? [...navItems, adminItem] : navItems;

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 py-6 hidden lg:flex flex-col overflow-y-auto z-40">
      <div className="px-4 mb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-3">Main Menu</p>
        <nav className="space-y-1">
          {displayItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group
                ${isActive 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto px-6 py-6 border-t border-gray-100">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 border border-primary/10">
          <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Trading Guide</p>
          <p className="text-[11px] text-gray-600 leading-relaxed mb-3">
            Analyze charts using ML patterns before placing trades.
          </p>
          <button className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
            Learn patterns <TrendingUp className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
