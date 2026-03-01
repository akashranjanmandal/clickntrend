import React from 'react';
import { X, ShoppingCart, Package, Tag, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Combo, ComboProduct } from '../types';
import { getImageUrl, formatCurrency } from '../utils/helpers';

interface ComboDetailsModalProps {
  combo: Combo;
  onClose: () => void;
  onAddToCart: (combo: Combo) => void;
}

const ComboDetailsModal: React.FC<ComboDetailsModalProps> = ({ combo, onClose, onAddToCart }) => {
  const comboProducts = combo.combo_products || [];
  const originalPrice = comboProducts.reduce(
    (sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1),
    0
  );
  const finalPrice = combo.discount_price ?? originalPrice;
  const savings = originalPrice - finalPrice;
  const savingsPercentage = savings > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Image */}
              <div className="space-y-4">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                  <img
                    src={getImageUrl(combo.image_url)}
                    alt={combo.name}
                    className="w-full h-full object-cover"
                  />
                  {savings > 0 && (
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg">
                      <span className="font-bold">Save {savingsPercentage}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-premium-charcoal mb-2">
                    {combo.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="text-gray-600">4.9 (128 reviews)</span>
                  </div>
                </div>

                <p className="text-gray-600 leading-relaxed">
                  {combo.description}
                </p>

                {/* Products List */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5 text-premium-gold" />
                    Included Items ({comboProducts.length})
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comboProducts.map((item: ComboProduct, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={getImageUrl(item.product?.image_url)}
                          alt={item.product?.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × {formatCurrency(item.product?.price || 0)}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatCurrency((item.product?.price || 0) * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-4">
                  {savings > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="line-through text-gray-400">
                        {formatCurrency(originalPrice)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Your Price:</span>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-premium-gold">
                        {formatCurrency(finalPrice)}
                      </span>
                      {savings > 0 && (
                        <p className="text-sm text-green-600">
                          You save {formatCurrency(savings)} ({savingsPercentage}%)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      onAddToCart(combo);
                      onClose();
                    }}
                    className="flex-1 py-4 bg-premium-gold text-white rounded-xl hover:bg-premium-burgundy transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ComboDetailsModal;