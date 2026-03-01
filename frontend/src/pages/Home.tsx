import React, { useState, useEffect } from 'react';
import {
  Search, Sparkles, TrendingUp, Shield, Gift,
  ArrowRight, Loader2, X, ChevronRight, Grid, Users, Package
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import HeroSection from '../components/HeroSection';
import ProductDetailsModal from '../components/ProductDetailsModal';
import { Product, Category, HeroContent, Stat, Combo } from '../types';
import { apiFetch } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import ComboCard from '../components/ComboCard';
import Popup from '../components/Popup';

interface CategoryWithSubcategories extends Category {
  subcategories: string[];
}

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [heroes, setHeroes] = useState<HeroContent[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  
  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSubcategories | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'products' | 'combos'>('products');
  
  // Available filters
  const [availableGenders, setAvailableGenders] = useState<string[]>(['all']);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const defaultStats = [
    { label: 'Happy Customers', value: '10K+', icon: '😊' },
    { label: 'Premium Gifts', value: '500+', icon: '🎁' },
    { label: 'Cities Served', value: '50+', icon: '📍' },
    { label: '5 Star Ratings', value: '4.9/5', icon: '⭐' }
  ];

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Update available genders when selections change
  useEffect(() => {
    updateAvailableGenders();
  }, [selectedCategory, selectedSubcategory, products]);

  // Check for popup
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
      
      const [productsData, categoriesData, heroesData, statsData, combosData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/categories').catch(() => []),
        apiFetch('/api/hero').catch(() => []),
        apiFetch('/api/settings?key=stats').catch(() => ({ value: defaultStats })),
        apiFetch('/api/combos').catch(() => [])
      ]);

      setProducts(productsData || []);
      
      // Process categories to extract subcategories from products - FIXED
      const categoriesWithSubcats = (categoriesData || []).map((cat: Category) => {
        const categoryProducts = (productsData || []).filter((p: Product) => p.category === cat.name);
        // Explicitly type the filter callback
        const subcategories = [...new Set(
          categoryProducts
            .map((p: Product) => p.subcategory)
            .filter((sub: string | undefined): sub is string => sub !== undefined && sub !== null)
        )];
        
        return {
          ...cat,
          subcategories
        };
      });
      
      setCategories(categoriesWithSubcats);
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

 // Update available genders based on current filters - FIXED
const updateAvailableGenders = () => {
  let filtered = [...products];
  
  if (selectedCategory) {
    filtered = filtered.filter(p => p.category === selectedCategory.name);
  }
  
  if (selectedSubcategory) {
    filtered = filtered.filter(p => p.subcategory === selectedSubcategory);
  }
  
  // Get unique genders and convert to string array without type predicate
  const genderValues = filtered
    .map(p => p.gender)
    .filter((g): g is 'men' | 'women' | 'unisex' | 'kids' => g !== undefined && g !== null);
  
  // Convert the filtered values to strings
  const genderStrings = genderValues.map(g => g as string);
  
  const genders = ['all', ...new Set(genderStrings)];
  
  setAvailableGenders(genders);
};
  // Filter products based on selections
  const getFilteredProducts = () => {
    let filtered = [...products];
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory.name);
    }
    
    if (selectedSubcategory) {
      filtered = filtered.filter(p => p.subcategory === selectedSubcategory);
    }
    
    if (selectedGender !== 'all') {
      filtered = filtered.filter(p => p.gender === selectedGender);
    }
    
    return filtered;
  };

  // Filter combos based on selections
  const getFilteredCombos = () => {
    if (!selectedCategory && !selectedSubcategory && selectedGender === 'all') return combos;
    
    return combos.filter(combo => {
      const comboProducts = combo.combo_products || [];
      
      // Check if combo has any product matching the filters
      return comboProducts.some(item => {
        const product = item.product;
        if (!product) return false;
        
        if (selectedCategory && product.category !== selectedCategory.name) return false;
        if (selectedSubcategory && product.subcategory !== selectedSubcategory) return false;
        if (selectedGender !== 'all' && product.gender !== selectedGender) return false;
        
        return true;
      });
    });
  };

  const handleCategorySelect = (category: CategoryWithSubcategories) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSelectedGender('all');
    setViewMode('products');
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedGender('all');
  };

  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedGender('all');
  };

  const handleBackToSubcategories = () => {
    setSelectedSubcategory(null);
    setSelectedGender('all');
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

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowSearchResults(false);
  };

  const filteredProducts = getFilteredProducts();
  const filteredCombos = getFilteredCombos();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-premium-gold" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {showPopup && <Popup onClose={() => setShowPopup(false)} />}

      {/* Hero Section */}
      {heroes.length > 0 ? (
        <HeroSection heroes={heroes} />
      ) : (
        <div className="h-96 bg-gradient-to-r from-premium-charcoal to-premium-burgundy flex items-center justify-center text-white">
          <div className="text-center">
            <h1 className="text-5xl font-serif font-bold mb-4">GFTD</h1>
            <p className="text-xl">The Art Of Gifting</p>
          </div>
        </div>
      )}

      {/* Search Section */}
      <section className="relative -mt-20 z-20 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-2 flex items-center">
                <div className="flex-1 flex items-center px-4">
                  <Search className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by product name or category..."
                    className="w-full px-4 py-4 focus:outline-none"
                  />
                  {searchTerm && (
                    <button onClick={() => {
                      setSearchTerm('');
                      setShowSearchResults(false);
                    }} className="p-1 hover:bg-gray-100 rounded-full">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={searchLoading}
                  className="px-8 py-4 bg-premium-gold text-white rounded-xl hover:bg-premium-burgundy transition-colors disabled:opacity-50 flex items-center gap-2"
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
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border max-h-96 overflow-y-auto z-50"
                  >
                    {searchLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-premium-gold mx-auto" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y">
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4 transition-colors"
                          >
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{product.name}</h4>
                              <p className="text-sm text-gray-600">{product.category}</p>
                              <p className="text-premium-gold font-semibold mt-1">
                                ₹{product.price.toLocaleString()}
                              </p>
                            </div>
                          </div>
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

      {/* Category Navigation */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={handleBackToCategories}
              className={`px-4 py-2 rounded-full transition-colors ${
                !selectedCategory
                  ? 'bg-premium-gold text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {selectedCategory && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <button
                  onClick={handleBackToSubcategories}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    !selectedSubcategory
                      ? 'bg-premium-gold text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedCategory.name}
                </button>
              </>
            )}
            {selectedSubcategory && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="px-4 py-2 bg-premium-gold text-white rounded-full">
                  {selectedSubcategory}
                </span>
              </>
            )}
            {selectedGender !== 'all' && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="px-4 py-2 bg-premium-gold text-white rounded-full capitalize">
                  {selectedGender}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Categories Grid (Level 1) */}
      {!selectedCategory && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-serif font-bold mb-8 text-center">
              Shop by <span className="text-premium-gold">Category</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  name={category.name}
                  icon={category.icon}
                  icon_type={category.icon_type || 'lucide'}
                  color={category.color}
                  hover_effect={category.hover_effect}
                  count={products.filter(p => p.category === category.name).length}
                  onClick={() => handleCategorySelect(category)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Subcategories Grid (Level 2) */}
      {selectedCategory && !selectedSubcategory && selectedCategory.subcategories.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-serif font-bold mb-8 text-center">
              {selectedCategory.name} - <span className="text-premium-gold">Subcategories</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <button
                onClick={() => setViewMode('products')}
                className={`p-6 rounded-2xl text-center transition-all ${
                  viewMode === 'products'
                    ? 'bg-premium-gold text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid className="h-8 w-8 mx-auto mb-2" />
                <span className="font-medium">All Products</span>
                <p className="text-sm mt-1">{filteredProducts.length} items</p>
              </button>
              
              <button
                onClick={() => setViewMode('combos')}
                className={`p-6 rounded-2xl text-center transition-all ${
                  viewMode === 'combos'
                    ? 'bg-premium-gold text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Package className="h-8 w-8 mx-auto mb-2" />
                <span className="font-medium">All Combos</span>
                <p className="text-sm mt-1">{filteredCombos.length} combos</p>
              </button>
              
              {selectedCategory.subcategories.map((sub: string) => (
                <button
                  key={sub}
                  onClick={() => handleSubcategorySelect(sub)}
                  className="p-6 bg-gradient-to-br from-gray-50 to-white border rounded-2xl hover:border-premium-gold hover:shadow-lg transition-all text-center"
                >
                  <span className="text-lg font-medium">{sub}</span>
                  <p className="text-sm text-gray-500 mt-2">
                    {products.filter(p => p.subcategory === sub).length} items
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gender Filter (Level 3) */}
      {(selectedSubcategory || (selectedCategory && selectedCategory.subcategories.length === 0)) && availableGenders.length > 1 && (
        <section className="py-6 bg-white border-b">
          <div className="container mx-auto px-4">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-premium-gold" />
              Filter by Gender
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableGenders.map((gender) => (
                <button
                  key={gender}
                  onClick={() => handleGenderSelect(gender)}
                  className={`px-6 py-3 rounded-full text-sm capitalize transition-all ${
                    selectedGender === gender
                      ? 'bg-premium-gold text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {gender === 'all' ? 'All Genders' : gender}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products/Combos Grid (Level 4) */}
      {(selectedSubcategory || (selectedCategory && selectedCategory.subcategories.length === 0)) && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="text-3xl font-serif font-bold">
                {selectedSubcategory || selectedCategory?.name}
                {selectedGender !== 'all' && ` - ${selectedGender}`}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('products')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'products'
                      ? 'bg-premium-gold text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Products ({filteredProducts.length})
                </button>
                <button
                  onClick={() => setViewMode('combos')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'combos'
                      ? 'bg-premium-gold text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Combos ({filteredCombos.length})
                </button>
              </div>
            </div>

            {viewMode === 'products' && (
              filteredProducts.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-gray-500">No products found matching your criteria.</p>
                </div>
              )
            )}

            {viewMode === 'combos' && (
              filteredCombos.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredCombos.map((combo, index) => (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ComboCard combo={combo} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-gray-500">No combos found matching your criteria.</p>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-premium-charcoal mb-1">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section (when no category selected) */}
      {!selectedCategory && (
        <>
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-between mb-12">
                <div>
                  <h2 className="text-4xl font-serif font-bold">
                    Featured <span className="text-premium-gold">Gifts</span>
                  </h2>
                  <p className="text-gray-600 mt-2">Handpicked premium collection</p>
                </div>
                <a
                  href="/products"
                  className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors group"
                >
                  <span>View All Collection</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.slice(0, 6).map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Featured Combos */}
          {combos.length > 0 && (
            <section className="py-20 bg-gradient-to-b from-white to-premium-cream/30">
              <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center justify-between mb-12">
                  <div>
                    <h2 className="text-4xl font-serif font-bold">
                      Curated <span className="text-premium-gold">Gift Combos</span>
                    </h2>
                    <p className="text-gray-600 mt-2">Expertly crafted gift sets</p>
                  </div>
                  <a
                    href="/combos"
                    className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors group"
                  >
                    <span>View All Combos</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {combos.slice(0, 3).map((combo, index) => (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ComboCard combo={combo} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-premium-charcoal to-premium-burgundy text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Gift className="h-16 w-16 mx-auto mb-6 text-premium-gold" />
            <h2 className="text-4xl font-serif font-bold mb-6">
              Create Your Perfect Gift Combo
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Mix and match premium gifts to create a personalized experience
            </p>
            <a
              href="/custom-combo"
              className="inline-flex items-center px-8 py-4 bg-premium-gold text-white rounded-xl hover:bg-white hover:text-premium-charcoal transition-all duration-300 text-lg font-medium group"
            >
              <Sparkles className="mr-3 h-6 w-6" />
              Design Custom Combo
              <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default Home;