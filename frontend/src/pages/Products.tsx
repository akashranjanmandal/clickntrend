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
      
      // Extract unique subcategories from products
      const uniqueSubcategories: string[] = ['all'];
      
      if (productsData && Array.isArray(productsData)) {
        productsData.forEach((product: Product) => {
          if (product.subcategory && !uniqueSubcategories.includes(product.subcategory)) {
            uniqueSubcategories.push(product.subcategory);
          }
        });
      }
      
      setSubcategories(uniqueSubcategories);
      
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

    // Filter by gender
    if (selectedGender !== 'all') {
      filtered = filtered.filter(product => 
        product.gender === selectedGender
      );
    }

    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(product => 
        product.subcategory === selectedSubcategory
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
      default:
        // 'popular' - keep as is from API
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
    setPriceRange([0, Math.max(...products.map(p => p.price), 50000)]);
    setSelectedCategories([]);
    setSelectedGender('all');
    setSelectedSubcategory('all');
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold mb-0.5 sm:mb-1 md:mb-2">
            Our <span className="text-premium-gold">Collection</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            Discover the perfect gift for every occasion
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-premium-gold text-white rounded-lg text-xs sm:text-sm"
        >
          <Filter className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Active Filters Display */}
      {(selectedCategories.length > 0 || selectedGender !== 'all' || selectedSubcategory !== 'all') && (
        <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 mb-3 sm:mb-4 md:mb-6">
          {selectedCategories.map(cat => (
            <span key={cat} className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-premium-gold/10 text-premium-gold rounded-full text-[10px] sm:text-xs md:text-sm flex items-center gap-0.5 sm:gap-1">
              Category: {cat}
              <button onClick={() => toggleCategory(cat)} className="hover:bg-premium-gold/20 rounded-full p-0.5">
                <X className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
              </button>
            </span>
          ))}
          {selectedGender !== 'all' && (
            <span className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-premium-gold/10 text-premium-gold rounded-full text-[10px] sm:text-xs md:text-sm flex items-center gap-0.5 sm:gap-1 capitalize">
              For: {selectedGender}
              <button onClick={() => setSelectedGender('all')} className="hover:bg-premium-gold/20 rounded-full p-0.5">
                <X className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
              </button>
            </span>
          )}
          {selectedSubcategory !== 'all' && (
            <span className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-premium-gold/10 text-premium-gold rounded-full text-[10px] sm:text-xs md:text-sm flex items-center gap-0.5 sm:gap-1">
              Subcategory: {selectedSubcategory}
              <button onClick={() => setSelectedSubcategory('all')} className="hover:bg-premium-gold/20 rounded-full p-0.5">
                <X className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Sort Bar */}
      <div className="flex justify-end mb-3 sm:mb-4 md:mb-6">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base border rounded-lg focus:outline-none focus:border-premium-gold bg-white"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      <div className="flex gap-2 sm:gap-4 md:gap-8">
        {/* Filters Sidebar */}
        <AnimatePresence>
          {(showFilters || window.innerWidth >= 768) && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`${showFilters ? 'fixed inset-0 z-50 md:relative md:inset-auto' : ''} w-full md:w-72 lg:w-80 flex-shrink-0`}
            >
              <div className="bg-white rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg md:sticky md:top-24 h-full md:h-auto overflow-y-auto max-h-[calc(100vh-120px)]">
                <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
                  <h3 className="font-serif text-sm sm:text-base md:text-lg font-semibold flex items-center gap-1 md:gap-2">
                    <SlidersHorizontal className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    Filters
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="md:hidden p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                {/* Price Range */}
                <div className="mb-4 sm:mb-6 md:mb-8">
                  <h4 className="font-medium text-xs sm:text-sm md:text-base mb-2 sm:mb-3 md:mb-4">Price Range</h4>
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    <input
                      type="range"
                      min="0"
                      max={Math.max(...products.map(p => p.price), 50000)}
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full accent-premium-gold"
                    />
                    <div className="flex justify-between text-[10px] sm:text-xs md:text-sm">
                      <span>₹{priceRange[0].toLocaleString()}</span>
                      <span>₹{priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-4 sm:mb-6 md:mb-8">
                  <h4 className="font-medium text-xs sm:text-sm md:text-base mb-2 sm:mb-3 md:mb-4">Categories</h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    {[...new Set(products.map(p => p.category))].map(category => (
                      <label key={category} className="flex items-center justify-between cursor-pointer group text-xs sm:text-sm md:text-base">
                        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                            className="rounded border-premium-gold text-premium-gold focus:ring-premium-gold h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4"
                          />
                          <span className="group-hover:text-premium-gold transition-colors">
                            {category}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-xs md:text-sm text-gray-500">
                          {products.filter(p => p.category === category).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gender Filter - Now Dynamic */}
                <div className="mb-4 sm:mb-6 md:mb-8">
                  <h4 className="font-medium text-xs sm:text-sm md:text-base mb-2 sm:mb-3 md:mb-4">For</h4>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
                    <button
                      onClick={() => setSelectedGender('all')}
                      className={`px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-2 rounded-full text-[10px] sm:text-xs md:text-sm capitalize transition-colors ${
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
                        className={`px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-2 rounded-full text-[10px] sm:text-xs md:text-sm capitalize transition-colors flex items-center gap-0.5 sm:gap-1 ${
                          selectedGender === gender.name
                            ? 'bg-premium-gold text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{gender.icon}</span>
                        <span>{gender.display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subcategories */}
                {subcategories.length > 1 && (
                  <div className="mb-4 sm:mb-6 md:mb-8">
                    <h4 className="font-medium text-xs sm:text-sm md:text-base mb-2 sm:mb-3 md:mb-4">Subcategory</h4>
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
                      {subcategories.map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setSelectedSubcategory(sub)}
                          className={`px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-2 rounded-full text-[10px] sm:text-xs md:text-sm capitalize transition-colors ${
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
                  className="w-full mt-3 sm:mt-4 md:mt-8 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm md:text-base border border-premium-gold text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded mb-1.5"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded w-2/3 mb-1.5"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
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
                  <div className="text-4xl sm:text-5xl mb-3">😕</div>
                  <h3 className="text-lg sm:text-xl font-serif font-bold mb-2">No Products Found</h3>
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
  );
};

export default Products;