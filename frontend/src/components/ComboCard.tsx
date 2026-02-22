import React, { useState } from 'react';
import { ShoppingCart, Star, Eye, Tag } from 'lucide-react';
import { Combo, ComboProduct } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { motion } from 'framer-motion';

interface ComboCardProps {
  combo: Combo;
}

const ComboCard: React.FC<ComboCardProps> = ({ combo }) => {
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

  const addToCart = () => {
    addItem({
      id: `combo-${combo.id}`,
      name: combo.name,
      price: finalPrice,
      quantity: 1,
      image_url: combo.image_url || '',
      type: 'combo',
    });
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-premium-gold/10"
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
          <div className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
            <Tag className="h-3 w-3" />
            Save {savingsPercentage}%
          </div>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="font-serif text-xl font-semibold text-premium-charcoal mb-2 line-clamp-1">
          {combo.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {combo.description}
        </p>

        {/* Products preview */}
        <div className="flex items-center gap-1 mb-4">
          <div className="flex -space-x-2">
            {comboProducts.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden"
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
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-800 text-white text-xs flex items-center justify-center">
                +{comboProducts.length - 3}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 ml-2">
            {comboProducts.length} items
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-premium-gold">
              {formatCurrency(finalPrice)}
            </p>
            {savings > 0 && (
              <p className="text-sm text-gray-500 line-through">
                {formatCurrency(originalPrice)}
              </p>
            )}
          </div>
          
          <button
            onClick={addToCart}
            className="px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-medium text-sm flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ComboCard;