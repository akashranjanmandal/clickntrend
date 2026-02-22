import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Star, ShoppingCart, Sparkles, Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchCombosDirectly } from '../utils/supabase';
import { useCart } from '../context/CartContext';
import { Combo, ComboProduct } from '../types';
import toast from 'react-hot-toast';
import { getImageUrl, formatCurrency } from '../utils/helpers';

export default function Combos() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { addItem } = useCart();

  const { data: rawCombos = [], isLoading } = useQuery({
    queryKey: ['combos'],
    queryFn: fetchCombosDirectly,
  });

  // Normalize Supabase response → Combo[]
  const combos: Combo[] = rawCombos.map((combo: any) => ({
    ...combo,
    combo_products: (combo.combo_products || []).map((cp: any) => ({
      product: cp.product,
      quantity: cp.quantity ?? 1,
    })),
  }));

  const categories = ['All', 'Birthday', 'Anniversary', 'Valentine', 'Luxury', 'Corporate'];

  const addToCart = (combo: Combo) => {
    const comboProducts = combo.combo_products || [];
    const originalPrice = comboProducts.reduce(
      (sum: number, item: ComboProduct) =>
        sum + item.product.price * item.quantity,
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
        sum + item.product.price * item.quantity,
      0
    );

    if (originalPrice <= combo.discount_price) return null;

    const savings = originalPrice - combo.discount_price;
    const percentage = Math.round((savings / originalPrice) * 100);

    return { savings, percentage };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Package className="w-8 h-8 text-primary-600" />
          <Sparkles className="w-8 h-8 text-yellow-500" />
          <Package className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-5xl font-serif font-bold text-gray-900 mb-4">
          Curated Gift Combos
        </h1>
        <p className="text-xl text-gray-600">
          Expertly crafted gift sets that make every occasion special
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2 rounded-full transition-all ${
              selectedCategory === category
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Combos Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-2xl h-64 mb-4" />
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : combos.length > 0 ? (
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {combos.map((combo: Combo) => {
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
                    src={getImageUrl(combo.image_url) || 'https://images.unsplash.com/photo-1544716278-e513176f20b5'}
                    alt={combo.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                    <h3 className="text-xl font-semibold text-gray-900">
                      {combo.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">4.9</span>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-6 line-clamp-2">
                    {combo.description}
                  </p>

                  {/* Products */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span>
                        Includes {comboProducts.length} premium items:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {comboProducts.slice(0, 3).map((item: ComboProduct) => (
                        <span
                          key={item.product.id}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {item.quantity}x {item.product.name.split(' ')[0]}
                        </span>
                      ))}
                      {comboProducts.length > 3 && (
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                          +{comboProducts.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      {combo.discount_price ? (
                        <>
                          <span className="text-2xl font-bold text-gray-900">
                            ₹{combo.discount_price.toLocaleString()}
                          </span>
                          {savings && (
                            <span className="text-gray-400 line-through ml-2">
                              ₹{(combo.discount_price + savings.savings).toLocaleString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-gray-900">
                          ₹{comboProducts
                            .reduce(
                              (sum: number, item: ComboProduct) =>
                                sum + item.product.price * item.quantity,
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
                    className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            No combos available
          </h3>
          <p className="text-gray-600">
            Check back soon for new curated gift sets!
          </p>
        </div>
      )}
    </div>
  );
}