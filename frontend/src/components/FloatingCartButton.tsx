import React, { useState, useEffect } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';

interface FloatingCartButtonProps {
  onClick: () => void;
  hide?: boolean; // Add this prop
}

const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({ onClick, hide = false }) => {
  const { items } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [prevItemCount, setPrevItemCount] = useState(0);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Listen for cart drawer state changes
  useEffect(() => {
    const handleCartDrawerState = (e: CustomEvent) => {
      setIsCartDrawerOpen(e.detail.isOpen);
    };

    window.addEventListener('cartDrawerStateChange', handleCartDrawerState as EventListener);
    
    return () => {
      window.removeEventListener('cartDrawerStateChange', handleCartDrawerState as EventListener);
    };
  }, []);

  // Animate when item count changes
  useEffect(() => {
    if (itemCount > prevItemCount) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevItemCount(itemCount);
  }, [itemCount]);

  // Auto-hide tooltip after 5 seconds
  useEffect(() => {
    if (itemCount > 0) {
      const timer = setTimeout(() => setShowTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  // Don't show button if:
  // - cart is empty
  // - cart drawer is open
  // - hide prop is true (for checkout page)
  if (itemCount === 0 || isCartDrawerOpen || hide) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 50 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-6 right-6 z-50"
    >
      {/* Mini Cart Preview */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className="absolute right-full mr-4 bottom-0 bg-white rounded-lg shadow-2xl p-3 min-w-[200px]"
          >
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute -top-2 -right-2 bg-gray-200 rounded-full p-1 hover:bg-gray-300"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="font-medium text-gray-800 mb-2">Cart Summary</p>
            <div className="space-y-1 mb-2">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="text-xs text-gray-600 flex justify-between">
                  <span className="truncate max-w-[120px]">{item.name}</span>
                  <span className="font-medium">x{item.quantity}</span>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-gray-500">+{items.length - 3} more items</p>
              )}
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold">
              <span>Total:</span>
              <span className="text-premium-gold">₹{totalPrice.toLocaleString()}</span>
            </div>
            <div className="absolute right-[-6px] bottom-4 w-3 h-3 bg-white rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        onClick={onClick}
        onHoverStart={() => setShowTooltip(true)}
        animate={isAnimating ? {
          scale: [1, 1.3, 1],
          rotate: [0, -15, 15, -15, 0],
        } : {}}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.5 }}
        className="relative bg-gradient-to-r from-premium-gold to-premium-burgundy text-white p-4 rounded-full shadow-2xl hover:shadow-premium-gold/50 transition-shadow group"
      >
        <ShoppingCart className="h-6 w-6" />
        
        {/* Item Count Badge with Animation */}
        <motion.div
          key={itemCount}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg"
        >
          {itemCount}
        </motion.div>

        {/* Multiple Ripple Effects */}
        <motion.div
          animate={{
            scale: [1, 2, 2.5],
            opacity: [0.5, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute inset-0 bg-premium-gold rounded-full"
          style={{ zIndex: -1 }}
        />
        <motion.div
          animate={{
            scale: [1, 1.8, 2.2],
            opacity: [0.3, 0.2, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 0.5,
            ease: "easeOut",
          }}
          className="absolute inset-0 bg-premium-burgundy rounded-full"
          style={{ zIndex: -2 }}
        />

        {/* Hover Effect - Show "View Cart" text */}
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap"
        >
          View Cart
          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 rotate-45" />
        </motion.span>
      </motion.button>

      {/* Pulse Animation when items added */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-premium-gold rounded-full"
            style={{ zIndex: -3 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FloatingCartButton;