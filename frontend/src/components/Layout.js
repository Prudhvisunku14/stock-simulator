import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="flex pt-16">
        <Sidebar user={user} />
        
        <main className="flex-1 w-full min-w-0 lg:pl-64 transition-all duration-300">
          <div className="p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
