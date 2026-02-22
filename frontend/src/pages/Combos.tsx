import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Star, ShoppingCart, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Combo, ComboProduct } from '../types';
import toast from 'react-hot-toast';
import { getImageUrl, formatCurrency } from '../utils/helpers';
import { apiFetch } from '../config';
import { Link } from 'react-router-dom';

export default function Combos() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    fetchCombos();
  }, []);

  const fetchCombos = async () => {
    try {
      setLoading(true);
      console.log('Fetching combos from API...');
      const data = await apiFetch('/api/combos');
      console.log('Combos fetched:', data);
      setCombos(data || []);
    } catch (error) {
      console.error('Error fetching combos:', error);
      toast.error('Failed to load combos');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Birthday', 'Anniversary', 'Valentine', 'Corporate', 'Christmas'];

  const filteredCombos = selectedCategory === 'All' 
    ? combos 
    : combos.filter(combo => {
        const comboProducts = combo.combo_products || [];
        return comboProducts.some((item: ComboProduct) => 
          item.product?.category === selectedCategory
        );
      });

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

  const calculateSavings = (combo: Combo) => {
    if (!combo.discount_price) return null;

    const comboProducts = combo.combo_products || [];
    const originalPrice = comboProducts.reduce(
      (sum: number, item: ComboProduct) =>
        sum + (item.product?.price || 0) * (item.quantity || 1),
      0
    );

    if (originalPrice <= combo.discount_price) return null;

    const savings = originalPrice - combo.discount_price;
    const percentage = Math.round((savings / originalPrice) * 100);

    return { savings, percentage };
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products"
              className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
            >
              Browse Products
            </Link>
            <Link
              to="/custom-combo"
              className="px-6 py-3 border border-premium-gold text-premium-gold rounded-lg hover:bg-premium-gold/10 transition-colors"
            >
              Create Custom Combo
            </Link>
          </div>
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

      {/* Categories Filter */}
      {combos.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full transition-all ${
                selectedCategory === category
                  ? 'bg-premium-gold text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Combos Grid */}
      <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCombos.map((combo: Combo) => {
          const comboProducts = combo.combo_products || [];
          const savings = calculateSavings(combo);

          return (
            <motion.div
              key={combo.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={getImageUrl(combo.image_url)}
                  alt={combo.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&h=400&fit=crop';
                  }}
                />

                {savings && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg">
                    <div className="text-sm font-bold">
                      Save {savings.percentage}%
                    </div>
                    <div className="text-xs">
                      ₹{savings.savings.toLocaleString()} off
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-serif font-semibold text-premium-charcoal">
                    {combo.name}
                  </h3>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-600">4.9</span>
                  </div>
                </div>

                <p className="text-gray-600 mb-6 line-clamp-2">
                  {combo.description}
                </p>

                {/* Products Preview */}
                {comboProducts.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span>Includes {comboProducts.length} premium items:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {comboProducts.slice(0, 3).map((item: ComboProduct) => (
                        <span
                          key={item.product?.id}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {item.quantity}x {item.product?.name?.split(' ')[0] || 'Item'}
                        </span>
                      ))}
                      {comboProducts.length > 3 && (
                        <span className="px-3 py-1 bg-premium-gold/10 text-premium-gold text-sm rounded-full">
                          +{comboProducts.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    {combo.discount_price ? (
                      <>
                        <span className="text-2xl font-bold text-premium-gold">
                          ₹{combo.discount_price.toLocaleString()}
                        </span>
                        {savings && (
                          <span className="text-gray-400 line-through ml-2 text-sm">
                            ₹{(combo.discount_price + savings.savings).toLocaleString()}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-premium-gold">
                        ₹{comboProducts
                          .reduce(
                            (sum: number, item: ComboProduct) =>
                              sum + (item.product?.price || 0) * (item.quantity || 1),
                            0
                          )
                          .toLocaleString()}
                      </span>
                    )}
                  </div>

                  {combo.discount_percentage && (
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <Tag className="w-5 h-5" />
                      {combo.discount_percentage}% OFF
                    </div>
                  )}
                </div>

                {/* Add to Cart */}
                <button
                  onClick={() => addToCart(combo)}
                  className="w-full bg-gradient-to-r from-premium-gold to-premium-burgundy text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Show message if no combos match the selected category */}
      {filteredCombos.length === 0 && combos.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No combos found in this category.</p>
          <button
            onClick={() => setSelectedCategory('All')}
            className="mt-4 px-6 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
          >
            View All Combos
          </button>
        </div>
      )}
    </div>
  );
}