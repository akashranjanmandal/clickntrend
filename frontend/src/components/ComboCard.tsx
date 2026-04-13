import React, { useState, useEffect, useRef } from 'react';
import { Star, Eye, Tag, Gift, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { Combo, ComboProduct } from '../types';
import { formatCurrency, getImageUrl,getProductImage  } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface ComboCardProps {
  combo: Combo;
  onShowMore?: (combo: Combo) => void;
}

const ComboCard: React.FC<ComboCardProps> = ({ combo, onShowMore }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cardImageIdx, setCardImageIdx] = useState(0);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allImages = [combo.image_url, ...((combo.additional_images || []))].filter(Boolean) as string[];

  // Auto-slide on hover
  useEffect(() => {
    if (isHovered && allImages.length > 1) {
      autoSlideRef.current = setInterval(() => setCardImageIdx(p => (p + 1) % allImages.length), 1800);
    } else {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    }
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  }, [isHovered, allImages.length]);
  
  const comboProducts = combo.combo_products || [];
  
  const originalPrice = comboProducts.reduce(
    (sum: number, item: ComboProduct) =>
      sum + item.product.price * item.quantity,
    0
  );

  // Admin-set price is always what the customer pays
  const finalPrice = combo.discount_price != null ? combo.discount_price : originalPrice;
  const savings = (combo.discount_price != null && combo.discount_price < originalPrice)
    ? originalPrice - combo.discount_price
    : 0;
  const savingsPercentage = combo.discount_percentage ||
    (savings > 0 ? Math.round((savings / originalPrice) * 100) : 0);

  const handleShowMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowMore) {
      onShowMore(combo);
    }
  };

  // Glow effect variants
  const glowVariants = {
    hover: {
      boxShadow: "0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.1)",
      transition: { duration: 0.3 }
    }
  }; 

  const shineVariants = {
    hover: {
      x: ["0%", "100%"],
      transition: { duration: 0.6, ease: "easeInOut" }
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative cursor-pointer"
      onClick={() => navigate(`/combo/${combo.id}`)}
    >
      <motion.div 
        variants={glowVariants}
        whileHover="hover"
        className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl overflow-hidden border border-premium-gold/10 h-full"
      >
        {/* Animated Shine Effect */}
        <motion.div
          variants={shineVariants}
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10"
        />
        
        {/* Premium Border Gradient */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-premium-gold/20 via-transparent to-premium-gold/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="relative">
          {/* Image Container */}
          <div className="relative overflow-hidden aspect-[4/3]">
            {/* Premium Gradient Overlay on Hover */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
              initial={false}
              animate={{ opacity: isHovered ? 1 : 0 }}
            />
            
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
            )}
            
            <motion.img
              src={getImageUrl(allImages[cardImageIdx] || combo.image_url)}
              alt={combo.name}
              className={`w-full h-full object-cover transition-all duration-700 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isHovered ? 'scale-110' : 'scale-100'}`}
              onLoad={() => setImageLoaded(true)}
              animate={{ scale: isHovered ? 1.1 : 1 }}
              transition={{ duration: 0.6 }}
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
            />
            {/* Image nav dots */}
            {allImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setCardImageIdx(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === cardImageIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
            
            {/* Discount Badge with Animation */}
            {savingsPercentage > 0 && (
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="absolute top-3 right-3 z-20"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-md opacity-50" />
                  <div className="relative bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Save {savingsPercentage}%
                  </div>
                </div>
              </motion.div>
            )}
            
          
          </div>
          
          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-serif text-sm font-semibold text-premium-charcoal line-clamp-1 flex-1">
                {combo.name}
              </h3>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-0.5 bg-gradient-to-r from-yellow-50 to-amber-50 px-2 py-0.5 rounded-full ml-2"
              >
                <Sparkles className="h-3 w-3 text-premium-gold" />
                <span className="text-[10px] font-semibold text-gray-700">Combo</span>
              </motion.div>
            </div>
            
            <p className="text-gray-500 text-xs mb-3 line-clamp-2">
              {combo.description}
            </p>

            {/* Products preview with Animation */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mb-3"
            >
              <div className="flex -space-x-2">
                {comboProducts.slice(0, 4).map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden shadow-md"
                    title={`${item.quantity}x ${item.product.name}`}
                  >
                    <img
                      src={getImageUrl(getProductImage(item.product))}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                    />
                  </motion.div>
                ))}
                {comboProducts.length > 4 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-r from-premium-gold to-yellow-500 text-white text-xs flex items-center justify-center font-bold shadow-md"
                  >
                    +{comboProducts.length - 4}
                  </motion.div>
                )}
              </div>
              <span className="text-[10px] text-gray-500">
                {comboProducts.length} premium items
              </span>
            </motion.div>

            {/* Price and Show More Button */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <div>
                <motion.p 
                  whileHover={{ scale: 1.05 }}
                  className="text-base font-bold bg-gradient-to-r from-premium-gold to-yellow-500 bg-clip-text text-transparent"
                >
                  {formatCurrency(finalPrice)}
                </motion.p>
                {originalPrice !== finalPrice && (
                  <p className="text-[10px] text-gray-400 line-through">
                    MRP: {formatCurrency(originalPrice)}
                  </p>
                )}
              </div>
            
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ComboCard;