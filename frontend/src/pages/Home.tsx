import React, { useState, useEffect } from 'react';
import {
  Search, Sparkles, TrendingUp, Shield, Gift,
  ArrowRight, Loader2
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import HeroSection from '../components/HeroSection';
import { Product, Category, HeroContent, Stat } from '../types';
import { apiFetch } from '../config';
import { motion } from 'framer-motion';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroes, setHeroes] = useState<HeroContent[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const presetSearches = [
    { text: 'Anniversary Gift', icon: '💝' },
    { text: 'Birthday Gift', icon: '🎂' },
    { text: 'Valentine Week', icon: '❤️' },
    { text: 'Corporate Gift', icon: '💼' },
    { text: 'Premium Hamper', icon: '🎁' },
    { text: 'Custom Combo', icon: '✨' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Use apiFetch which handles the base URL correctly
      const [productsData, categoriesData, heroesData, statsData] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/categories'),
        apiFetch('/api/hero'),
        apiFetch('/api/settings/public?key=stats')
      ]);

      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setHeroes(heroesData || []);
      setStats(statsData?.value || [
        { label: 'Happy Customers', value: '10K+', icon: '😊' },
        { label: 'Premium Gifts', value: '500+', icon: '🎁' },
        { label: 'Cities Served', value: '50+', icon: '📍' },
        { label: '5 Star Ratings', value: '4.9/5', icon: '⭐' }
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchText?: string) => {
    const searchQuery = searchText || searchTerm;
    
    if (!searchQuery.trim()) {
      await fetchAllData();
      return;
    }

    setSearchLoading(true);
    try {
      const data = await apiFetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
      setProducts(data);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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
      <HeroSection heroes={heroes} />

      {/* Search Section */}
      <section className="relative -mt-20 z-20 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-2 flex items-center">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search for perfect gifts..."
                  className="w-full px-4 py-4 focus:outline-none"
                />
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

            {/* Preset Searches */}
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              {presetSearches.map((item, index) => (
                <motion.button
                  key={item.text}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSearchTerm(item.text);
                    handleSearch(item.text);
                  }}
                  className="px-4 py-2 bg-white/90 backdrop-blur-sm border border-premium-gold/20 rounded-full hover:bg-premium-gold hover:text-white transition-all duration-300 flex items-center gap-2 shadow-lg"
                >
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </motion.button>
              ))}
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
                <CategoryCard
                  key={category.id}
                  name={category.name}
                  icon={category.icon}
                  icon_type={category.icon_type || 'emoji'}
                  color={category.color}
                  hover_effect={category.hover_effect}
                  count={products.filter(p => p.category === category.name).length}
                  onClick={() => window.location.href = `/products?category=${category.name.toLowerCase()}`}
                />
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