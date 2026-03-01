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

      {/* Active Filters Display */}
      {(selectedCategories.length > 0 || selectedGender !== 'all' || selectedSubcategory !== 'all') && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map(cat => (
            <span key={cat} className="px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-sm flex items-center gap-1">
              Category: {cat}
              <button onClick={() => toggleCategory(cat)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedGender !== 'all' && (
            <span className="px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-sm flex items-center gap-1 capitalize">
              For: {selectedGender}
              <button onClick={() => setSelectedGender('all')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedSubcategory !== 'all' && (
            <span className="px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-sm flex items-center gap-1">
              Subcategory: {selectedSubcategory}
              <button onClick={() => setSelectedSubcategory('all')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

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
              <div className="bg-white rounded-2xl p-6 shadow-lg md:sticky md:top-24 h-full md:h-auto overflow-y-auto max-h-[calc(100vh-120px)]">
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
                    {[...new Set(products.map(p => p.category))].map(category => (
                      <label key={category} className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                            className="rounded border-premium-gold text-premium-gold focus:ring-premium-gold"
                          />
                          <span className="group-hover:text-premium-gold transition-colors">
                            {category}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {products.filter(p => p.category === category).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gender Filter - Now Dynamic */}
                <div className="mb-8">
                  <h4 className="font-medium mb-4">For</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGender('all')}
                      className={`px-4 py-2 rounded-full text-sm capitalize transition-colors ${
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
                        className={`px-4 py-2 rounded-full text-sm capitalize transition-colors flex items-center gap-1 ${
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
                  <div className="mb-8">
                    <h4 className="font-medium mb-4">Subcategory</h4>
                    <div className="flex flex-wrap gap-2">
                      {subcategories.map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setSelectedSubcategory(sub)}
                          className={`px-4 py-2 rounded-full text-sm capitalize transition-colors ${
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
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 md:p-6 animate-pulse">
          <div className="h-32 md:h-48 bg-gray-200 rounded-lg mb-3 md:mb-4"></div>
          <div className="h-3 md:h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 md:h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  ) : (
    <>
      <div className="mb-6 text-gray-600">
        Showing {filteredProducts.length} of {products.length} products
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
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
            onClick={clearFilters}
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