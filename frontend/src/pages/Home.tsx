import React, { useState, useEffect } from 'react';
import {
  Search, Sparkles, TrendingUp, Shield, Gift,
  ArrowRight, Loader2, X
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import HeroSection from '../components/HeroSection';
import { Product, Category, HeroContent, Stat } from '../types';
import { apiFetch } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroes, setHeroes] = useState<HeroContent[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const defaultStats = [
    { label: 'Happy Customers', value: '10K+', icon: '😊' },
    { label: 'Premium Gifts', value: '500+', icon: '🎁' },
    { label: 'Cities Served', value: '50+', icon: '📍' },
    { label: '5 Star Ratings', value: '4.9/5', icon: '⭐' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [productsData, categoriesData, heroesData, statsData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/categories').catch(() => []),
        apiFetch('/api/hero').catch(() => []),
        apiFetch('/api/settings?key=stats').catch(() => ({ value: defaultStats }))
      ]);

      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setHeroes(heroesData || []);
      setStats(statsData?.value || defaultStats);
    } catch (error) {
      console.error('Error fetching data:', error);
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
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
      // Search by product name and category
      const data = await apiFetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    window.location.href = `/products?category=${category.toLowerCase()}`;
  };


  const clearSearch = () => {
    setSearchTerm('');
    setShowSearchResults(false);
    setSearchResults([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-premium-gold" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
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
                    <button onClick={clearSearch} className="p-1 hover:bg-gray-100 rounded-full">
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
                            onClick={() => window.location.href = `/product/${product.id}`}
                            className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
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

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-white to-premium-cream/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-serif font-bold mb-4">
                Shop by <span className="text-premium-gold">Occasion</span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Perfect gifts curated for every special moment in life
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`bg-gradient-to-br ${category.color} p-6 rounded-2xl text-center cursor-pointer hover:shadow-2xl transition-all duration-300`}
                >
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h3 className="font-serif text-lg font-semibold text-premium-charcoal">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    {products.filter(p => p.category === category.name).length} gifts
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
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
    </div>
  );
};

export default Home;