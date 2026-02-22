import React, { useState, useEffect } from 'react';
import { Filter, X, SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import { Product, Category } from '../types';
import { apiFetch } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'newest'>('popular');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, priceRange, selectedCategories, sortBy]);

  const fetchData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/categories').catch(() => [])
      ]);
      
      setProducts(productsData || []);
      setFilteredProducts(productsData || []);
      setCategories(categoriesData || []);
      
      // Set max price from products
      const maxPrice = productsData.length > 0 
        ? Math.max(...productsData.map((p: Product) => p.price), 50000)
        : 50000;
      setPriceRange([0, maxPrice]);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Filter by price
    filtered = filtered.filter(
      product => product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product =>
        selectedCategories.includes(product.category)
      );
    }

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'popular':
      default:
        // In a real app, you'd sort by popularity based on orders/reviews
        break;
    }

    setFilteredProducts(filtered);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">
            Our <span className="text-premium-gold">Collection</span>
          </h1>
          <p className="text-gray-600">
            Discover the perfect gift for every occasion
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center space-x-2 px-4 py-2 bg-premium-gold text-white rounded-lg"
        >
          <Filter className="h-5 w-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Sort Bar */}
      <div className="flex justify-end mb-6">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold bg-white"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      <div className="flex gap-8">
        {/* Filters Sidebar */}
        <AnimatePresence>
          {(showFilters || window.innerWidth >= 768) && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`${showFilters ? 'fixed inset-0 z-50 md:relative md:inset-auto' : ''} w-full md:w-80 flex-shrink-0`}
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg md:sticky md:top-24 h-full md:h-auto overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filters
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="md:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Price Range */}
                <div className="mb-8">
                  <h4 className="font-medium mb-4">Price Range</h4>
                  <div className="space-y-4">
                    <input
                      type="range"
                      min="0"
                      max={Math.max(...products.map(p => p.price), 50000)}
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full accent-premium-gold"
                    />
                    <div className="flex justify-between text-sm">
                      <span>₹{priceRange[0].toLocaleString()}</span>
                      <span>₹{priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-8">
                  <h4 className="font-medium mb-4">Categories</h4>
                  <div className="space-y-2">
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.name)}
                            onChange={() => toggleCategory(category.name)}
                            className="rounded border-premium-gold text-premium-gold focus:ring-premium-gold"
                          />
                          <span className="group-hover:text-premium-gold transition-colors">
                            {category.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {products.filter(p => p.category === category.name).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => {
                    setPriceRange([0, Math.max(...products.map(p => p.price), 50000)]);
                    setSelectedCategories([]);
                  }}
                  className="w-full mt-8 px-4 py-3 border border-premium-gold text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Grid */}
        <div className="flex-1">
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
            <>
              <div className="mb-6 text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="text-6xl mb-4">😕</div>
                  <h3 className="text-2xl font-serif font-bold mb-2">No Products Found</h3>
                  <p className="text-gray-600 mb-6">
                    No products match your selected filters. Try adjusting your criteria.
                  </p>
                  <button
                    onClick={() => {
                      setPriceRange([0, Math.max(...products.map(p => p.price), 50000)]);
                      setSelectedCategories([]);
                    }}
                    className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
                  >
                    Clear Filters
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;