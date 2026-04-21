import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, Portfolio, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';

const TransactionPopup = ({ isOpen, onClose, data, type = 'success' }) => {
  useEffect(() => {
    if (isOpen && type === 'success') {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className={`p-8 text-center ${type === 'success' ? 'bg-success/5' : 'bg-danger/5'}`}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-block mb-4"
            >
              {type === 'success' ? (
                <CheckCircle2 className="w-20 h-20 text-success mx-auto" />
              ) : (
                <XCircle className="w-20 h-20 text-danger mx-auto" />
              )}
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {type === 'success' ? 'Order Successful!' : 'Order Failed'}
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              {type === 'success' ? 'Your transaction has been processed' : 'Something went wrong with your order'}
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Stock</span>
                <span className="text-sm font-bold text-gray-900">{data?.symbol}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Quantity</span>
                <span className="text-sm font-bold text-gray-900">{data?.quantity} Shares</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Price</span>
                <span className="text-sm font-bold text-gray-900">₹{parseFloat(data?.price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-900 font-bold">Total Amount</span>
                <span className="text-lg font-black text-primary">₹{parseFloat(data?.total || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/portfolio';
                }}
                className="w-full btn btn-primary py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                View Portfolio <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Continue Trading
              </button>
            </div>
          </div>
          
          <div className="px-8 pb-6 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Powered by StockSim Engine</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TransactionPopup;
