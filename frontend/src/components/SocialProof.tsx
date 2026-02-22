import React, { useState, useEffect } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialProofProps {
  product: Product;
  className?: string;
}

const SocialProof: React.FC<SocialProofProps> = ({ product, className = '' }) => {
  const [currentCount, setCurrentCount] = useState(product.social_proof_count || 9);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!product.social_proof_enabled) return;

    // Simulate random count updates
    const interval = setInterval(() => {
      setCurrentCount(prev => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        const newCount = prev + change;
        return Math.max(5, Math.min(20, newCount)); // Keep between 5 and 20
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [product.social_proof_enabled]);

  if (!product.social_proof_enabled) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`flex items-center gap-2 ${className}`}
        >
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-6 h-6 rounded-full border-2 border-white bg-gradient-to-br from-purple-400 to-pink-400"
              />
            ))}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="font-medium text-gray-700">
              🔺 {currentCount} People are Purchasing Right Now
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProof;