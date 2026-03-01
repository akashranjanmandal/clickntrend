import React, { useState, useEffect } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialProofProps {
  product: Product;
  className?: string;
}

const SocialProof: React.FC<SocialProofProps> = ({ product, className = '' }) => {
  const [currentCount, setCurrentCount] = useState<number>(() => {
    if (product.social_proof_enabled) {
      const initial = product.social_proof_initial_count || 5;
      const end = product.social_proof_end_count || 15;
      return Math.floor(Math.random() * (end - initial + 1)) + initial;
    }
    return 5;
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!product.social_proof_enabled) return;

    // Update count periodically within the initial-end range
    const interval = setInterval(() => {
      setCurrentCount((prev: number) => {
        const initial = product.social_proof_initial_count || 5;
        const end = product.social_proof_end_count || 15;
        // Generate random number between initial and end
        return Math.floor(Math.random() * (end - initial + 1)) + initial;
      });
    }, 8000); // Update every 8 seconds

    return () => clearInterval(interval);
  }, [product.social_proof_enabled, product.social_proof_initial_count, product.social_proof_end_count]);

  if (!product.social_proof_enabled) return null;

  // Format the text with the current count
  const displayText = product.social_proof_text 
    ? product.social_proof_text.replace('{count}', currentCount.toString())
    : `🔺 ${currentCount} People are Purchasing Right Now`;

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
              {displayText}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProof;