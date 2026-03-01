import React, { useState, useEffect } from 'react';
import {
  Search, Sparkles, TrendingUp, Shield, Gift,
  ArrowRight, Loader2, X, ChevronRight, Users, Package,
  Heart, Clock, Award, Star, Gem, Rocket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Add this import
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import HeroSection from '../components/HeroSection';
import ProductDetailsModal from '../components/ProductDetailsModal';
import ComboDetailsModal from '../components/ComboDetailsModal';
import { Product, Category, HeroContent, Stat, Combo, Gender } from '../types';
import { apiFetch } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import ComboCard from '../components/ComboCard';
import Popup from '../components/Popup';

const Home: React.FC = () => {
  const navigate = useNavigate(); // Add navigate hook
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [heroes, setHeroes] = useState<HeroContent[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  
  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'products' | 'combos'>('products');
  
  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  const defaultStats = [
    { label: 'Happy Customers', value: '10K+', icon: '😊' },
    { label: 'Premium Gifts', value: '500+', icon: '🎁' },
    { label: 'Cities Served', value: '50+', icon: '📍' },
    { label: '5 Star Ratings', value: '4.9/5', icon: '⭐' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const checkPopup = async () => {
      try {
        const popup = await apiFetch('/api/popups/active').catch(() => null);
        if (popup) {
          const hasSeen = sessionStorage.getItem('popup_seen');
          if (!hasSeen) {
            setShowPopup(true);
            sessionStorage.setItem('popup_seen', 'true');
          }
        }
      } catch (error) {
        console.error('Error checking popup:', error);
      }
    };
    checkPopup();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [productsData, categoriesData, gendersData, heroesData, statsData, combosData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/categories').catch(() => []),
        apiFetch('/api/genders').catch(() => []),
        apiFetch('/api/hero').catch(() => []),
        apiFetch('/api/settings?key=stats').catch(() => ({ value: defaultStats })),
        apiFetch('/api/combos').catch(() => [])
      ]);

      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setGenders(gendersData || []);
      setHeroes(heroesData || []);
      setStats(statsData?.value || defaultStats);
      setCombos(combosData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on selections
  const getFilteredProducts = () => {
    let filtered = [...products];
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory.name);
    }
    
    if (selectedGender !== 'all') {
      filtered = filtered.filter(p => p.gender === selectedGender);
    }
    
    return filtered;
  };

  // Filter combos based on selections
  const getFilteredCombos = () => {
    if (!selectedCategory && selectedGender === 'all') return combos;
    
    return combos.filter(combo => {
      const comboProducts = combo.combo_products || [];
      
      // Check if combo has any product matching the filters
      return comboProducts.some(item => {
        const product = item.product;
        if (!product) return false;
        
        if (selectedCategory && product.category !== selectedCategory.name) return false;
        if (selectedGender !== 'all' && product.gender !== selectedGender) return false;
        
        return true;
      });
    });
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedGender('all');
    setViewMode('products');
  };

  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedGender('all');
    // Don't navigate, just clear local state
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowSearchResults(false);
  };

  const handleComboClick = (combo: Combo) => {
    setSelectedCombo(combo);
  };

  const handleSearch = async (searchText?: string) => {
    const query = searchText || searchTerm;
    
    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);
    
    try {
      const data = await apiFetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const filteredProducts = getFilteredProducts();
  const filteredCombos = getFilteredCombos();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-premium-gold border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-gradient-to-b from-white to-gray-50">
      {showPopup && <Popup onClose={() => setShowPopup(false)} />}

      {/* Hero Section */}
      {heroes.length > 0 ? (
        <HeroSection heroes={heroes} />
      ) : (
        <div className="relative h-[600px] bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-premium-gold rounded-full filter blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600 rounded-full filter blur-3xl animate-pulse delay-1000" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center relative z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <Gift className="h-20 w-20 text-premium-gold" />
            </motion.div>
            <h1 className="text-6xl md:text-7xl font-serif font-bold mb-6">
              GFTD
            </h1>
            <p className="text-2xl text-gray-300 mb-8">The Art Of Gifting</p>
            <button
              onClick={() => navigate('/products')}
              className="px-8 py-4 bg-premium-gold text-white rounded-full font-medium inline-flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
            >
              Explore Collection
              <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        </div>
      )}

      {/* Search Section */}
      <section className="relative -mt-24 z-20 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-2 flex items-center border border-white/20">
                <div className="flex-1 flex items-center px-4">
                  <Search className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by product name or category..."
                    className="w-full px-4 py-4 focus:outline-none bg-transparent"
                  />
                  {searchTerm && (
                    <button onClick={() => {
                      setSearchTerm('');
                      setShowSearchResults(false);
                    }} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={searchLoading}
                  className="px-8 py-4 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-2xl hover:from-premium-burgundy hover:to-premium-gold transition-all duration-300 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                >
                  {searchLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Search
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearchResults && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 max-h-96 overflow-y-auto z-50"
                  >
                    {searchLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-premium-gold mx-auto" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {searchResults.map((product) => (
                          <motion.div
                            key={product.id}
                            whileHover={{ backgroundColor: '#f9fafb' }}
                            onClick={() => handleProductClick(product)}
                            className="p-4 cursor-pointer flex items-center gap-4 transition-colors"
                          >
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-xl"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{product.name}</h4>
                              <p className="text-sm text-gray-600">{product.category}</p>
                              <p className="text-sm text-gray-500 capitalize">{product.gender}</p>
                              <p className="text-premium-gold font-semibold mt-1">
                                ₹{product.price.toLocaleString()}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        No products found for "{searchTerm}"
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-8 bg-white/50 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={handleBackToCategories}
              className={`px-4 py-2 rounded-full transition-all duration-300 ${
                !selectedCategory
                  ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {selectedCategory && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="px-4 py-2 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-full shadow-md">
                  {selectedCategory.name}
                </span>
              </>
            )}
            {selectedGender !== 'all' && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="px-4 py-2 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-full shadow-md capitalize">
                  {selectedGender}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Categories Grid (Level 1) */}
      {!selectedCategory && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <h2 className="text-5xl font-serif font-bold mb-4">
                Shop by <span className="bg-gradient-to-r from-premium-gold to-yellow-500 bg-clip-text text-transparent">Category</span>
              </h2>
              <p className="text-xl text-gray-600">
                Explore our curated collection of premium gifts
              </p>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <CategoryCard
                    name={category.name}
                    icon={category.icon}
                    icon_type={category.icon_type || 'lucide'}
                    color={category.color}
                    hover_effect={category.hover_effect}
                    count={products.filter(p => p.category === category.name).length}
                    onClick={() => handleCategorySelect(category)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gender Filter (Level 2) */}
      {selectedCategory && (
        <section className="py-12 bg-white/50 backdrop-blur-sm border-b border-gray-200">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-premium-gold" />
                Filter by Gender
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => handleGenderSelect('all')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm capitalize transition-all duration-300 ${
                    selectedGender === 'all'
                      ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  All Genders
                </button>
                {genders.map((gender) => (
                  <button
                    key={gender.name}
                    onClick={() => handleGenderSelect(gender.name)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm capitalize transition-all duration-300 ${
                      selectedGender === gender.name
                        ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <span className="mr-1 sm:mr-2">{gender.icon}</span>
                    {gender.display_name}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* View Toggle (Products/Combos) */}
      {selectedCategory && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setViewMode('products')}
                className={`px-6 sm:px-8 py-2 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-all duration-300 ${
                  viewMode === 'products'
                    ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Products ({filteredProducts.length})
              </button>
              <button
                onClick={() => setViewMode('combos')}
                className={`px-6 sm:px-8 py-2 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-all duration-300 ${
                  viewMode === 'combos'
                    ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Combos ({filteredCombos.length})
              </button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-premium-gold to-yellow-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <Gift className="h-20 w-20 text-white" />
            </motion.div>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-6">
              Create Your Perfect Gift Combo
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-8">
              Mix and match premium gifts to create a personalized experience
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/custom-combo')}
              className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-premium-gold rounded-full hover:shadow-2xl transition-all duration-300 text-base sm:text-lg font-medium group"
            >
              <Sparkles className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Design Custom Combo
              <ArrowRight className="ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-2 transition-transform" />
            </motion.button>
          </motion.div>
        </div>
      </section>
      
      {/* Products/Combos Grid */}
      {selectedCategory && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold mb-6 sm:mb-8"
            >
              {selectedCategory.name}
              {selectedGender !== 'all' && (
                <span className="text-premium-gold"> for {selectedGender}</span>
              )}
            </motion.h2>

            {viewMode === 'products' && (
              filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -3 }}
                      onClick={() => handleProductClick(product)}
                      className="cursor-pointer"
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="inline-block p-8 bg-gray-100 rounded-full mb-4">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-xl text-gray-500">No products found matching your criteria.</p>
                </motion.div>
              )
            )}

            {viewMode === 'combos' && (
              filteredCombos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredCombos.map((combo, index) => (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -3 }}
                    >
                      <ComboCard 
                        combo={combo} 
                        onShowMore={handleComboClick}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="inline-block p-8 bg-gray-100 rounded-full mb-4">
                    <Gift className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-xl text-gray-500">No combos found matching your criteria.</p>
                </motion.div>
              )
            )}
          </div>
        </section>
      )}

      {/* Featured Products (when no category selected) */}
      {!selectedCategory && (
        <>
          <section className="py-20 bg-gradient-to-b from-white to-gray-50">
            <div className="container mx-auto px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col md:flex-row items-center justify-between mb-12"
              >
                <div>
                  <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-2">
                    Featured <span className="bg-gradient-to-r from-premium-gold to-yellow-500 bg-clip-text text-transparent">Gifts</span>
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-600">Handpicked premium collection</p>
                </div>
                <motion.button
                  whileHover={{ x: 5 }}
                  onClick={() => navigate('/products')}
                  className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-full hover:shadow-lg transition-all group"
                >
                  <span>View All Collection</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {products.slice(0, 8).map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -3 }}
                    onClick={() => handleProductClick(product)}
                    className="cursor-pointer"
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Featured Combos */}
          {combos.length > 0 && (
            <section className="py-20 bg-white">
              <div className="container mx-auto px-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex flex-col md:flex-row items-center justify-between mb-12"
                >
                  <div>
                    <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-2">
                      Curated <span className="bg-gradient-to-r from-premium-gold to-yellow-500 bg-clip-text text-transparent">Gift Combos</span>
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-600">Expertly crafted gift sets</p>
                  </div>
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => navigate('/combos')}
                    className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-full hover:shadow-lg transition-all group"
                  >
                    <span>View All Combos</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {combos.slice(0, 4).map((combo, index) => (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -3 }}
                    >
                      <ComboCard 
                        combo={combo} 
                        onShowMore={handleComboClick}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-4">
              Our <span className="text-premium-gold">Numbers</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-300">We take pride in our achievements</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-premium-gold mb-1 sm:mb-2">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm md:text-base text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modals */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {selectedCombo && (
        <ComboDetailsModal
          combo={selectedCombo}
          onClose={() => setSelectedCombo(null)}
        />
      )}
    </div>
  );
};

export default Home;