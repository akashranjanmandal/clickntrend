import React, { useState } from 'react';
import { ShoppingCart, Star, Eye, Tag } from 'lucide-react';
import { Combo, ComboProduct } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { motion } from 'framer-motion';

interface ComboCardProps {
  combo: Combo;
  onShowMore?: (combo: Combo) => void;
}

const ComboCard: React.FC<ComboCardProps> = ({ combo, onShowMore }) => {
  const { addItem } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const comboProducts = combo.combo_products || [];
  
  const originalPrice = comboProducts.reduce(
    (sum: number, item: ComboProduct) =>
      sum + item.product.price * item.quantity,
    0
  );

  const finalPrice = combo.discount_price ?? originalPrice;
  const savings = combo.discount_price ? originalPrice - combo.discount_price : 0;
  const savingsPercentage = combo.discount_percentage || 
    (savings > 0 ? Math.round((savings / originalPrice) * 100) : 0);

  const addToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: `combo-${combo.id}`,
      name: combo.name,
      price: finalPrice,
      quantity: 1,
      image_url: combo.image_url || '',
      type: 'combo',
    });
  };

  const handleShowMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowMore) {
      onShowMore(combo);
    }
  };

  const handleCardClick = () => {
    if (onShowMore) {
      onShowMore(combo);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={handleCardClick}
      className="group bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-premium-gold/10 cursor-pointer"
    >
      <div className="relative overflow-hidden aspect-[4/3]">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <img
          src={getImageUrl(combo.image_url)}
          alt={combo.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&h=300&fit=crop';
          }}
        />
        
        {savingsPercentage > 0 && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg flex items-center gap-0.5 sm:gap-1">
            <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            Save {savingsPercentage}%
          </div>
        )}
      </div>
      
      <div className="p-3 sm:p-4">
        <h3 className="font-serif text-sm sm:text-base font-semibold text-premium-charcoal mb-1 line-clamp-1">
          {combo.name}
        </h3>
        
        <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
          {combo.description}
        </p>

        {/* Products preview */}
        <div className="flex items-center gap-1 mb-2 sm:mb-3">
          <div className="flex -space-x-1.5 sm:-space-x-2">
            {comboProducts.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white bg-gray-200 overflow-hidden"
                title={`${item.quantity}x ${item.product.name}`}
              >
                <img
                  src={getImageUrl(item.product.image_url)}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {comboProducts.length > 3 && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white bg-gray-800 text-white text-[10px] sm:text-xs flex items-center justify-center">
                +{comboProducts.length - 3}
              </div>
            )}
          </div>
          <span className="text-[10px] sm:text-xs text-gray-500 ml-1">
            {comboProducts.length} items
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-base sm:text-lg font-bold text-premium-gold">
              {formatCurrency(finalPrice)}
            </p>
            {savings > 0 && (
              <p className="text-[10px] sm:text-xs text-gray-500 line-through">
                {formatCurrency(originalPrice)}
              </p>
            )}
          </div>
          
          <div className="flex gap-1 sm:gap-2">
            {/* Show More Button */}
            <button
              onClick={handleShowMore}
              className="p-1.5 sm:px-2 sm:py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="View details"
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            
            {/* Add to Cart Button */}
            <button
              onClick={addToCart}
              className="p-1.5 sm:px-2 sm:py-1.5 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
              title="Add to cart"
            >
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ComboCard;