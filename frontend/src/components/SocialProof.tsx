import React, { useState, useEffect } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../config';

interface SocialProofProps {
  product: Product;
  className?: string;
}

interface SocialProofData {
  text_template: string;
  count: number;
  initial_count: number;
  end_count: number;
  is_enabled: boolean;
  stats: {
    views: number;
    purchases: number;
  };
}

const SocialProof: React.FC<SocialProofProps> = ({ product, className = '' }) => {
  const [socialProof, setSocialProof] = useState<SocialProofData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSocialProof = async () => {
      if (!product.social_proof_enabled) return;
      
      setLoading(true);
      try {
        const data = await apiFetch(`/api/social-proof/${product.id}`).catch(() => null);
        if (data && data.is_enabled) {
          setSocialProof(data);
          
          // Track view
          await apiFetch('/api/social-proof/track-view', {
            method: 'POST',
            body: JSON.stringify({ product_id: product.id })
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Error fetching social proof:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSocialProof();
    
    // Refresh every 30 seconds to get updated counts
    const interval = setInterval(fetchSocialProof, 30000);

    return () => clearInterval(interval);
  }, [product.id, product.social_proof_enabled]);

  if (!product.social_proof_enabled || !socialProof || socialProof.count === 0) return null;

  // Format the text with the current count
  const displayText = socialProof.text_template.replace('{count}', socialProof.count.toString());

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
            {loading ? (
              <span className="font-medium text-gray-700 animate-pulse">
                Updating...
              </span>
            ) : (
              <span className="font-medium text-gray-700">
                {displayText}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProof;