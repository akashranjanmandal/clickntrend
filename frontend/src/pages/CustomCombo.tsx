import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Sparkles, ChevronRight,
  Users, X, Plus, Minus, Tag, Gift, Search, Save
} from 'lucide-react';
import { Product, Category, Gender } from '../types';
import toast from 'react-hot-toast';
import { getImageUrl, formatCurrency } from '../utils/helpers';
import { apiFetch } from '../config';
import CategoryCard from '../components/CategoryCard'; // Import CategoryCard

const CustomCombo: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, { product: Product; quantity: number }>>(new Map());
  
  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Combo details
  const [comboName, setComboName] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [productsData, categoriesData, gendersData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/categories').catch(() => []),
        apiFetch('/api/genders').catch(() => [])
      ]);

      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setGenders(gendersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedGender('all');
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
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

  const addToCombo = (product: Product) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(product.id);
      if (existing) {
        newMap.set(product.id, { product, quantity: existing.quantity + 1 });
      } else {
        newMap.set(product.id, { product, quantity: 1 });
      }
      return newMap;
    });
    toast.success(`${product.name} added to combo`);
  };

  const removeFromCombo = (productId: string) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCombo(productId);
      return;
    }
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(productId);
      if (existing) {
        newMap.set(productId, { ...existing, quantity });
      }
      return newMap;
    });
  };

  const calculateTotal = () => {
    let total = 0;
    selectedProducts.forEach(item => {
      total += item.product.price * item.quantity;
    });
    return total;
  };

  const saveCombo = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please add at least one product to your combo');
      return;
    }

    try {
      const comboData = {
        name: comboName || 'My Custom Combo',
        description: 'Custom created gift combo',
        products: Array.from(selectedProducts.values()).map(item => ({
          id: item.product.id,
          quantity: item.quantity
        })),
        total_price: calculateTotal(),
        special_requests: specialRequests
      };

      const response = await apiFetch('/api/combos/custom', {
        method: 'POST',
        body: JSON.stringify(comboData)
      });

      if (response.success) {
        toast.success('Combo saved successfully!');
        setSelectedProducts(new Map());
        setComboName('');
        setSpecialRequests('');
      }
    } catch (error) {
      console.error('Error saving combo:', error);
      toast.error('Failed to save combo');
    }
  };

  const filteredProducts = getFilteredProducts();
  const displayProducts = showSearchResults ? searchResults : filteredProducts;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-gold"></div>
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
          <Gift className="w-8 h-8 text-purple-600" />
        </motion.div>
        <h1 className="text-5xl font-serif font-bold text-premium-charcoal mb-4">
          Create Your Custom Combo
        </h1>
        <p className="text-xl text-gray-600">
          Mix and match products to create the perfect gift combination
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Side - Product Selection */}
        <div className="lg:col-span-2">
          {/* Search Bar - Same as Home page */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for products..."
                className="w-full pl-12 pr-4 py-4 border rounded-xl focus:border-premium-gold focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setShowSearchResults(false);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation - Same as Home page */}
          <section className="mb-8 bg-white border rounded-xl p-4">
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
                  <span className="px-4 py-2 bg-premium-gold text-white rounded-full">
                    {selectedCategory.name}
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
          </section>

          {/* Categories Grid - Using CategoryCard exactly like Home page */}
          {!selectedCategory && !showSearchResults && (
            <section className="mb-8">
              <h2 className="text-2xl font-serif font-bold mb-6">Choose a Category</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
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
            </section>
          )}

          {/* Gender Filter - Same as Home page */}
          {selectedCategory && !showSearchResults && (
            <section className="mb-8">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-premium-gold" />
                Filter by Gender
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleGenderSelect('all')}
                  className={`px-6 py-3 rounded-full text-sm capitalize transition-all ${
                    selectedGender === 'all'
                      ? 'bg-premium-gold text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Genders
                </button>
                {genders.map((gender) => (
                  <button
                    key={gender.name}
                    onClick={() => handleGenderSelect(gender.name)}
                    className={`px-6 py-3 rounded-full text-sm capitalize transition-all ${
                      selectedGender === gender.name
                        ? 'bg-premium-gold text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{gender.icon}</span>
                    {gender.display_name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Products Grid */}
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">
              {showSearchResults ? 'Search Results' : 'Select Products'}
            </h2>
            {displayProducts.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {displayProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-xl p-4 hover:border-premium-gold transition-all"
                  >
                    <div className="flex gap-4">
                      <img
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium line-clamp-1">{product.name}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-premium-gold font-bold">
                            {formatCurrency(product.price)}
                          </span>
                          <button
                            onClick={() => addToCombo(product)}
                            className="px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy text-sm"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                            {product.category}
                          </span>
                          {product.gender && (
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full capitalize">
                              {product.gender}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Side - Combo Builder */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
              <Package className="h-5 w-5 text-premium-gold" />
              Your Combo
            </h2>

            {/* Combo Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Combo Name (Optional)</label>
              <input
                type="text"
                value={comboName}
                onChange={(e) => setComboName(e.target.value)}
                placeholder="My Awesome Gift Combo"
                className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
              />
            </div>

            {/* Selected Products */}
            <div className="mb-4 max-h-96 overflow-y-auto">
              {selectedProducts.size === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Gift className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No products selected</p>
                  <p className="text-sm text-gray-400">Add products from the left panel</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from(selectedProducts.values()).map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                        <p className="text-xs text-gray-500">{formatCurrency(product.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="p-1 hover:bg-white rounded"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="p-1 hover:bg-white rounded"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeFromCombo(product.id)}
                          className="p-1 hover:bg-white rounded text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="text-2xl font-bold text-premium-gold">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>

            {/* Special Requests */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Special Requests</label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
                placeholder="Gift wrapping, personalized message, etc."
                className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={saveCombo}
              disabled={selectedProducts.size === 0}
              className="w-full py-4 bg-gradient-to-r from-premium-gold to-premium-burgundy text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              Save Combo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCombo;