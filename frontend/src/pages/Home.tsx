import React, { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, Shield, Gift, Star, ArrowRight, ChevronRight, Loader2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { CONFIG } from '../config';
import { motion } from 'framer-motion';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  const presetSearches = [
    { text: 'Anniversary Gift', icon: '💝' },
    { text: 'Birthday Gift', icon: '🎂' },
    { text: 'Valentine Week', icon: '❤️' },
    { text: 'Corporate Gift', icon: '💼' },
    { text: 'Premium Hamper', icon: '🎁' },
    { text: 'Custom Combo', icon: '✨' }
  ];

  const categories = [
    { name: 'Birthday', color: 'from-pink-100 to-pink-50', icon: '🎂'},
    { name: 'Anniversary', color: 'from-red-100 to-red-50', icon: '💝'},
    { name: 'Valentine', color: 'from-rose-100 to-rose-50', icon: '❤️'},
    { name: 'Wedding', color: 'from-purple-100 to-purple-50', icon: '💍'},
    { name: 'Corporate', color: 'from-blue-100 to-blue-50', icon: '💼' },
    { name: 'Christmas', color: 'from-green-100 to-green-50', icon: '🎄'},
  ];

  const stats = [
    { label: 'Happy Customers', value: '10K+', icon: '😊' },
    { label: 'Premium Gifts', value: '500+', icon: '🎁' },
    { label: 'Cities Served', value: '50+', icon: '📍' },
    { label: '5 Star Ratings', value: '4.9/5', icon: '⭐' },
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data);
      setFeaturedProducts(data.slice(0, 6));
    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback to dummy data
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchText?: string) => {
    const searchQuery = searchText || searchTerm;
    
    // If empty search, show all products
    if (!searchQuery.trim()) {
      await fetchProducts();
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProducts(data);
      setFeaturedProducts(data.slice(0, 6));
      
      // Show message if no results
      if (data.length === 0) {
        alert(`No products found for "${searchQuery}"`);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section with Gradient */}
      <section className="relative bg-gradient-to-br from-premium-cream via-white to-premium-gold/5 py-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-72 h-72 bg-premium-gold rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-premium-burgundy rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center px-4 py-2 bg-premium-gold/10 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-premium-gold mr-2" />
              <span className="text-premium-gold font-medium">Premium Gift Experience</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-premium-charcoal mb-6 leading-tight">
              Where Every Gift
              <span className="block text-premium-gold">Tells a Story</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover handcrafted luxury gifts that create unforgettable moments. 
              Premium quality, personalized service, and timeless elegance.
            </p>


            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4">
                  <div className="text-3xl font-bold text-premium-charcoal mb-2">{stat.value}</div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                  <div className="text-2xl mt-2">{stat.icon}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
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
              <motion.a
                key={category.name}
                href={`/products?category=${category.name.toLowerCase()}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.05 }}
                className={`bg-gradient-to-br ${category.color} p-6 rounded-2xl text-center hover:shadow-2xl transition-all duration-300 border border-white/50`}
              >
                <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>
                <h3 className="font-serif text-lg font-semibold text-premium-charcoal mb-2">
                  {category.name}
                </h3>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-gradient-to-b from-white to-premium-cream/30">
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

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product, index) => (
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
          )}
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

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-premium-cream/50">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-premium-gold rounded-full mb-6">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Premium Quality</h3>
              <p className="text-gray-600">
                Every gift is handpicked for exceptional quality and craftsmanship.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-premium-cream/50">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-premium-gold rounded-full mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Secure Payment</h3>
              <p className="text-gray-600">
                100% secure payments with Razorpay. Your data is always protected.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-premium-cream/50">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-premium-gold rounded-full mb-6">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Custom Combos</h3>
              <p className="text-gray-600">
                Create your own unique gift combos for personalized gifting experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;