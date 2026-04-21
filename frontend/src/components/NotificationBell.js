// components/NotificationBell.js
// FIXES:
//  - TrendingUp was used but never imported → added to import
//  - alert.stock_symbol → available via fixed alertController
//  - Socket events unified on NEW_ALERT
//  - Added periodic polling fallback every 60s

import React, { useState, useEffect, useRef } from 'react';
import { initSocket } from '../services/socket';
import { alertsAPI } from '../services/api';
import { toast, ToastContainer } from 'react-toastify';
import { Bell, X, Check, Trash2, Clock, AlertTriangle, TrendingUp } from 'lucide-react'; // FIX: added TrendingUp
import 'react-toastify/dist/ReactToastify.css';

const NotificationBell = ({ user }) => {
    const [alerts, setAlerts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchAlerts();

        // WebSocket for real-time alerts
        const token = localStorage.getItem('token');
        const socket = initSocket(token);

        const handleNewAlert = (newAlert) => {
            console.log('🔔 New Alert Received via WebSocket:', newAlert);
            
            setAlerts(prev => {
                // Avoid duplicates
                if (prev.find(a => a.id === newAlert.id)) return prev;
                return [{ ...newAlert, id: newAlert.id || Date.now() }, ...prev];
            });
            setUnreadCount(prev => prev + 1);

            toast.info(`${newAlert.title || newAlert.message}`, {
                position: 'top-right',
                icon: <AlertTriangle className="text-primary w-5 h-5" />,
                theme: 'light',
                autoClose: 5000,
            });
        };

        socket.on('NEW_ALERT', handleNewAlert);
        socket.on('stock_alert', handleNewAlert); // backward compat

        // Polling fallback every 60 seconds
        const pollInterval = setInterval(fetchAlerts, 60000);

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            socket.off('NEW_ALERT', handleNewAlert);
            socket.off('stock_alert', handleNewAlert);
            clearInterval(pollInterval);
        };
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await alertsAPI.get();
            const data = res.data.data || [];
            setAlerts(data);
            setUnreadCount(data.filter(a => !a.is_read).length);
        } catch (err) {
            console.error('Error fetching alerts:', err.message);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await alertsAPI.markRead(id);
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking alert as read:', err.message);
        }
    };

    const handleDeleteAlert = async (e, id) => {
        e.stopPropagation();
        try {
            const wasUnread = !alerts.find(a => a.id === id)?.is_read;
            await alertsAPI.delete(id);
            setAlerts(prev => prev.filter(a => a.id !== id));
            if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error deleting alert:', err.message);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl border transition-all duration-200 ${
                    isOpen
                        ? 'bg-primary/5 border-primary text-primary'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                }`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in duration-300">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-gray-200 rounded-3xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                            )}
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Alert List */}
                    <div className="max-h-[450px] overflow-y-auto py-2">
                        {alerts.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center gap-3">
                                <div className="p-3 bg-gray-50 rounded-full">
                                    <Bell className="w-6 h-6 text-gray-200" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    No alerts yet
                                </p>
                                <p className="text-xs text-gray-300">
                                    ML patterns will appear here
                                </p>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div
                                    key={alert.id}
                                    onClick={() => !alert.is_read && handleMarkAsRead(alert.id)}
                                    className={`relative p-5 hover:bg-gray-50/80 transition-all cursor-pointer border-b border-gray-50 last:border-0 group ${
                                        !alert.is_read ? 'bg-primary/[0.02]' : ''
                                    }`}
                                >
                                    {!alert.is_read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l"></div>
                                    )}

                                    <div className="flex justify-between items-start gap-3 mb-2">
                                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                                            alert.alert_type === 'pattern'
                                                ? 'bg-yellow-50 text-yellow-500'
                                                : 'bg-primary/10 text-primary'
                                        }`}>
                                            <TrendingUp className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                {alert.stock_symbol && (
                                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                                                        {alert.stock_symbol}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(alert.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            {alert.title && (
                                                <p className="text-[11px] font-black text-gray-700 mb-0.5">
                                                    {alert.title}
                                                </p>
                                            )}
                                            <p className={`text-xs leading-relaxed ${
                                                !alert.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-500'
                                            }`}>
                                                {alert.message}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteAlert(e, alert.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-300 transition-all flex-shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {!alert.is_read && (
                                        <button className="text-[10px] font-black text-primary hover:underline flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Mark read
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                        <button
                            onClick={fetchAlerts}
                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <ToastContainer position="top-right" />
        </div>
    );
};

export default NotificationBell;
