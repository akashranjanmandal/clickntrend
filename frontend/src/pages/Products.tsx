import React, { useState, useEffect } from 'react';
import { Filter, X, SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product, Gender } from '../types';
import { apiFetch } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';

const Products: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category');
  const initialSubcategory = searchParams.get('subcategory');

  const [products, setProducts] = useState<Product[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(
    initialSubcategory || 'all'
  );
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'newest'>('popular');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, priceRange, selectedCategories, selectedGender, selectedSubcategory, sortBy]);

  const fetchData = async () => {
    try {
      const [productsData, gendersData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/genders').catch(() => [])
      ]);
      
      setProducts(productsData || []);
      setFilteredProducts(productsData || []);
      setGenders(gendersData || []);
      
      const uniqueSubcategories: string[] = ['all'];
      
      if (productsData && Array.isArray(productsData)) {
        productsData.forEach((product: Product) => {
          if (product.subcategory && !uniqueSubcategories.includes(product.subcategory)) {
            uniqueSubcategories.push(product.subcategory);
          }
        });
      }
      
      setSubcategories(uniqueSubcategories);
      
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

    filtered = filtered.filter(
      product => product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product =>
        selectedCategories.includes(product.category || '') // Fixed: Added fallback for undefined category
      );
    }

    if (selectedGender !== 'all') {
      filtered = filtered.filter(product => 
        product.gender === selectedGender
      );
    }

    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(product => 
        product.subcategory === selectedSubcategory
      );
    }

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime() // Fixed: Added fallback for undefined created_at
        );
        break;
      default:
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

  const clearFilters = () => {
    const maxPrice = products.length > 0 
      ? Math.max(...products.map(p => p.price), 50000)
      : 50000;
    setPriceRange([0, maxPrice]);
    setSelectedCategories([]);
    setSelectedGender('all');
    setSelectedSubcategory('all');
  };

  // Get unique categories with proper filtering
  const uniqueCategories = [...new Set(
    products
      .map(p => p.category)
      .filter((category): category is string => category !== undefined && category !== null) // Fixed: Filter out undefined categories
  )];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold">
              Our <span className="text-premium-gold">Collection</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-0.5 sm:mt-1">
              Discover the perfect gift
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-premium-gold text-white rounded-lg text-sm"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Active Filters Display */}
        {(selectedCategories.length > 0 || selectedGender !== 'all' || selectedSubcategory !== 'all') && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {selectedCategories.map(cat => (
              <span key={cat} className="px-2 sm:px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-xs flex items-center gap-1">
                {cat}
                <button onClick={() => toggleCategory(cat)} className="hover:bg-premium-gold/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {selectedGender !== 'all' && (
              <span className="px-2 sm:px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-xs flex items-center gap-1 capitalize">
                {selectedGender}
                <button onClick={() => setSelectedGender('all')} className="hover:bg-premium-gold/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedSubcategory !== 'all' && (
              <span className="px-2 sm:px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-xs flex items-center gap-1">
                {selectedSubcategory}
                <button onClick={() => setSelectedSubcategory('all')} className="hover:bg-premium-gold/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Sort Bar */}
        <div className="flex justify-end mb-3 sm:mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-premium-gold bg-white"
          >
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6">
          {/* Filters Sidebar - Mobile Drawer */}
          <AnimatePresence>
            {showFilters && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowFilters(false)}
                  className="fixed inset-0 bg-black/50 z-40 md:hidden"
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween' }}
                  className="fixed left-0 top-0 bottom-0 w-[280px] sm:w-[320px] bg-white z-50 md:hidden overflow-y-auto"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                      </h3>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="p-2 hover:bg-gray-100 rounded-full"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    {/* Mobile Filter Content */}
                    <div className="space-y-4">
                      {/* Price Range */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">Price Range</h4>
                        <input
                          type="range"
                          min="0"
                          max={Math.max(...products.map(p => p.price), 50000)}
                          step="100"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                          className="w-full accent-premium-gold"
                        />
                        <div className="flex justify-between text-xs mt-1">
                          <span>₹{priceRange[0].toLocaleString()}</span>
                          <span>₹{priceRange[1].toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Categories */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">Categories</h4>
                        <div className="space-y-1.5">
                          {uniqueCategories.map(category => (
                            <label key={category} className="flex items-center justify-between cursor-pointer text-sm">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(category)}
                                  onChange={() => toggleCategory(category)}
                                  className="rounded border-premium-gold text-premium-gold focus:ring-premium-gold h-4 w-4"
                                />
                                <span>{category}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {products.filter(p => p.category === category).length}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Gender Filter */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">For</h4>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setSelectedGender('all')}
                            className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${
                              selectedGender === 'all'
                                ? 'bg-premium-gold text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            All
                          </button>
                          {genders.map((gender) => (
                            <button
                              key={gender.name}
                              onClick={() => setSelectedGender(gender.name)}
                              className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors flex items-center gap-1 ${
                                selectedGender === gender.name
                                  ? 'bg-premium-gold text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <span>{gender.icon}</span>
                              <span>{gender.display_name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subcategories */}
                      {subcategories.length > 1 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Subcategory</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {subcategories.map((sub) => (
                              <button
                                key={sub}
                                onClick={() => setSelectedSubcategory(sub)}
                                className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${
                                  selectedSubcategory === sub
                                    ? 'bg-premium-gold text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {sub === 'all' ? 'All' : sub}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clear Filters */}
                      <button
                        onClick={clearFilters}
                        className="w-full mt-4 px-4 py-2 text-sm border border-premium-gold text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Desktop Filters Sidebar */}
          <div className="hidden md:block w-64 lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-lg sticky top-24">
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-5 w-5" />
                Filters
              </h3>
              
              <div className="space-y-4 lg:space-y-6">
                {/* Price Range */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Price Range</h4>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(...products.map(p => p.price), 50000)}
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-premium-gold"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span>₹{priceRange[0].toLocaleString()}</span>
                    <span>₹{priceRange[1].toLocaleString()}</span>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Categories</h4>
                  <div className="space-y-1.5">
                    {uniqueCategories.map(category => (
                      <label key={category} className="flex items-center justify-between cursor-pointer text-sm">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                            className="rounded border-premium-gold text-premium-gold focus:ring-premium-gold h-4 w-4"
                          />
                          <span>{category}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {products.filter(p => p.category === category).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gender Filter */}
                <div>
                  <h4 className="font-medium text-sm mb-2">For</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedGender('all')}
                      className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${
                        selectedGender === 'all'
                          ? 'bg-premium-gold text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {genders.map((gender) => (
                      <button
                        key={gender.name}
                        onClick={() => setSelectedGender(gender.name)}
                        className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors flex items-center gap-1 ${
                          selectedGender === gender.name
                            ? 'bg-premium-gold text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>{gender.icon}</span>
                        <span>{gender.display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subcategories */}
                {subcategories.length > 1 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Subcategory</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {subcategories.map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setSelectedSubcategory(sub)}
                          className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${
                            selectedSubcategory === sub
                              ? 'bg-premium-gold text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {sub === 'all' ? 'All' : sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                <button
                  onClick={clearFilters}
                  className="w-full mt-4 px-4 py-2 text-sm border border-premium-gold text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-2 animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-1.5"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-1.5"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="mb-2 text-xs sm:text-sm text-gray-600">
                  Showing {filteredProducts.length} of {products.length} products
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {filteredProducts.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8 sm:py-12"
                  >
                    <div className="text-4xl mb-3">😕</div>
                    <h3 className="text-lg font-serif font-bold mb-2">No Products Found</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      No products match your selected filters.
                    </p>
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
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
    </div>
  );
};

export default Products;