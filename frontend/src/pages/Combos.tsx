import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Star, ShoppingCart, Sparkles, Tag, ArrowRight, 
  Filter, X, ChevronDown, ChevronUp, Heart, Share2,
  Eye, Truck, Shield, Clock, Gift
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Combo, ComboProduct, Category } from '../types';
import toast from 'react-hot-toast';
import { getImageUrl, formatCurrency } from '../utils/helpers';
import { apiFetch } from '../config';
import { Link } from 'react-router-dom';

export default function Combos() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [combos, setCombos] = useState<Combo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'newest'>('popular');
  const { addItem } = useCart();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [combosData, categoriesData] = await Promise.all([
        apiFetch('/api/combos').catch(() => []),
        apiFetch('/api/categories/public').catch(() => [])
      ]);
      
      console.log('Combos fetched:', combosData);
      console.log('Categories fetched:', categoriesData);
      
      setCombos(combosData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load combos');
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from combo products
  const availableCategories = ['All', ...new Set(
    combos.flatMap(combo => 
      (combo.combo_products || [])
        .map(item => item.product?.category)
        .filter(Boolean)
    )
  )];

  // Get unique genders from combo products
  const availableGenders = ['all', ...new Set(
    combos.flatMap(combo => 
      (combo.combo_products || [])
        .map(item => item.product?.gender)
        .filter(Boolean)
    )
  )];

  const filterAndSortCombos = () => {
    let filtered = [...combos];

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(combo => {
        const comboProducts = combo.combo_products || [];
        return comboProducts.some((item: ComboProduct) => 
          item.product?.category === selectedCategory
        );
      });
    }

    // Filter by gender
    if (selectedGender !== 'all') {
      filtered = filtered.filter(combo => {
        const comboProducts = combo.combo_products || [];
        return comboProducts.some((item: ComboProduct) => 
          item.product?.gender === selectedGender
        );
      });
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => {
          const priceA = a.discount_price || a.combo_products?.reduce((sum, item) => 
            sum + (item.product?.price || 0) * (item.quantity || 1), 0) || 0;
          const priceB = b.discount_price || b.combo_products?.reduce((sum, item) => 
            sum + (item.product?.price || 0) * (item.quantity || 1), 0) || 0;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        filtered.sort((a, b) => {
          const priceA = a.discount_price || a.combo_products?.reduce((sum, item) => 
            sum + (item.product?.price || 0) * (item.quantity || 1), 0) || 0;
          const priceB = b.discount_price || b.combo_products?.reduce((sum, item) => 
            sum + (item.product?.price || 0) * (item.quantity || 1), 0) || 0;
          return priceB - priceA;
        });
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredCombos = filterAndSortCombos();

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
        
        {/* Mobile Filter Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center justify-center gap-2 mx-auto mt-6 px-6 py-3 bg-premium-gold text-white rounded-lg"
        >
          <Filter className="h-5 w-5" />
          <span>Filters & Sort</span>
        </button>
      </div>

      {/* Filters Section */}
      <div className={`${showFilters ? 'block' : 'hidden md:block'} mb-8`}>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4 md:hidden">
            <h3 className="font-semibold text-lg">Filters</h3>
            <button onClick={() => setShowFilters(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            {/* Category Filter */}
            {availableCategories.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Gender Filter */}
            {availableGenders.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-2">For</label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
                >
                  {availableGenders.map(gender => (
                    <option key={gender} value={gender} className="capitalize">
                      {gender === 'all' ? 'All' : gender}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Results Count */}
            <div className="flex items-end">
              <p className="text-sm text-gray-600">
                Showing {filteredCombos.length} of {combos.length} combos
              </p>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedCategory !== 'All' || selectedGender !== 'all') && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
              {selectedCategory !== 'All' && (
                <span className="px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-sm flex items-center gap-1">
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('All')}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedGender !== 'all' && (
                <span className="px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-sm flex items-center gap-1 capitalize">
                  For: {selectedGender}
                  <button onClick={() => setSelectedGender('all')}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Combos Grid */}
      {filteredCombos.length > 0 ? (
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCombos.map((combo: Combo) => {
            const comboProducts = combo.combo_products || [];
            const savings = calculateSavings(combo);
            const totalValue = comboProducts.reduce(
              (sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1),
              0
            );

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

                  {/* Wishlist Button */}
                  <button className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-colors">
                    <Heart className="h-4 w-4" />
                  </button>
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
                        <Package className="h-4 w-4" />
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

                      {/* Gender Tags */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {[...new Set(comboProducts.map(item => item.product?.gender).filter(Boolean))].map(gender => (
                          <span
                            key={gender}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full capitalize"
                          >
                            {gender}
                          </span>
                        ))}
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
                          ₹{totalValue.toLocaleString()}
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

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => addToCart(combo)}
                      className="col-span-2 bg-gradient-to-r from-premium-gold to-premium-burgundy text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </button>
                  </div>

                  {/* Shipping Info */}
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      <span>Free shipping over ₹499</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>7-day returns</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-serif font-semibold text-gray-700 mb-2">
            No combos found
          </h3>
          <p className="text-gray-500 mb-6">
            Try adjusting your filters or check back later
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedGender('all');
              setSortBy('popular');
            }}
            className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}