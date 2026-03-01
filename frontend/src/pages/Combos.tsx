import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, Sparkles, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Combo, ComboProduct } from '../types';
import toast from 'react-hot-toast';
import { getImageUrl, formatCurrency } from '../utils/helpers';
import { apiFetch } from '../config';
import { Link } from 'react-router-dom';
import ComboDetailsModal from '../components/ComboDetailsModal';

export default function Combos() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    fetchCombos();
  }, []);

  const fetchCombos = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/combos').catch(() => []);
      setCombos(data || []);
    } catch (error) {
      console.error('Error fetching combos:', error);
      toast.error('Failed to load combos');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (combo: Combo) => {
    const comboProducts = combo.combo_products || [];
    const originalPrice = comboProducts.reduce(
      (sum: number, item: ComboProduct) =>
        sum + (item.product?.price || 0) * (item.quantity || 1),
      0
    );

    const finalPrice = combo.discount_price ?? originalPrice;

    addItem({
      id: `combo-${combo.id}`,
      name: combo.name,
      price: finalPrice,
      quantity: 1,
      image_url: combo.image_url || '',
      type: 'combo',
    });

    toast.success('Combo added to cart!');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading amazing combos...</p>
        </div>
      </div>
    );
  }

  if (!combos || combos.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-premium-cream rounded-full mb-6">
            <Package className="h-12 w-12 text-premium-gold" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-4">No Combos Yet</h1>
          <p className="text-gray-600 mb-8">
            We're crafting some amazing gift combos for you. Check back soon!
          </p>
          <Link
            to="/products"
            className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <Package className="w-8 h-8 text-premium-gold" />
          <Sparkles className="w-8 h-8 text-yellow-500" />
          <Package className="w-8 h-8 text-purple-600" />
        </motion.div>
        <h1 className="text-5xl font-serif font-bold text-premium-charcoal mb-4">
          Curated Gift Combos
        </h1>
        <p className="text-xl text-gray-600">
          Expertly crafted gift sets that make every occasion special
        </p>
      </div>

      {/* Combos Grid - Simple, no filters */}
      <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {combos.map((combo) => {
          const comboProducts = combo.combo_products || [];
          const originalPrice = comboProducts.reduce(
            (sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1),
            0
          );
          const finalPrice = combo.discount_price ?? originalPrice;
          const hasDiscount = combo.discount_price && finalPrice < originalPrice;

          return (
            <motion.div
              key={combo.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => setSelectedCombo(combo)}>
                <img
                  src={getImageUrl(combo.image_url)}
                  alt={combo.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&h=400&fit=crop';
                  }}
                />
                
                {/* Quick View Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCombo(combo);
                    }}
                    className="bg-white text-premium-charcoal px-6 py-3 rounded-xl font-semibold hover:bg-premium-gold hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Eye className="h-5 w-5" />
                    Quick View
                  </button>
                </div>

                {hasDiscount && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg">
                    <div className="text-sm font-bold">
                      Save {Math.round(((originalPrice - finalPrice) / originalPrice) * 100)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Content - Simplified */}
              <div className="p-6">
                <h3 className="text-xl font-serif font-semibold text-premium-charcoal mb-2">
                  {combo.name}
                </h3>
                
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {combo.description}
                </p>

                {/* Products count */}
                <p className="text-sm text-gray-500 mb-4">
                  {comboProducts.length} items included
                </p>

                {/* Price and Add to Cart */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-premium-gold">
                      ₹{finalPrice.toLocaleString()}
                    </p>
                    {hasDiscount && (
                      <p className="text-sm text-gray-500 line-through">
                        ₹{originalPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => addToCart(combo)}
                    className="px-6 py-3 bg-premium-gold text-white rounded-xl hover:bg-premium-burgundy transition-colors flex items-center gap-2"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Combo Details Modal */}
      {selectedCombo && (
        <ComboDetailsModal
          combo={selectedCombo}
          onClose={() => setSelectedCombo(null)}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}