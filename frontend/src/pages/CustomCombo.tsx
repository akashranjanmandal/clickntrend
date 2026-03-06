import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Sparkles, ChevronRight,
  Users, X, Plus, Minus, Tag, Gift, Search,
  Percent, ShoppingCart, Image as ImageIcon, Type
} from 'lucide-react';
import { Product, Category, Gender, CustomizationData, CartItem } from '../types';
import toast from 'react-hot-toast';
import { getImageUrl, formatCurrency } from '../utils/helpers';
import { apiFetch } from '../config';
import CategoryCard from '../components/CategoryCard';
import { useCart } from '../context/CartContext';
import ProductCustomizationModal from '../components/ProductCustomizationModal';

// Extended interface for combo cart item
interface ComboCartItem extends CartItem {
  combo_id: string;
  combo_name: string;
  is_combo_item: boolean;
  combo_products: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    image_url: string;
    customization?: CustomizationData;
  }>;
}

const CustomCombo: React.FC = () => {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, { 
    product: Product; 
    quantity: number;
    customization?: CustomizationData;
  }>>(new Map());
  
  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Customization modal state
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState<Product | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [pendingProductToAdd, setPendingProductToAdd] = useState<Product | null>(null);
  
  // Combo details
  const [comboName, setComboName] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [comboBuilderHeight, setComboBuilderHeight] = useState(0);
  const comboBuilderRef = useRef<HTMLDivElement>(null);

  // Discount tiers configuration
  const discountTiers = [
    { minItems: 0, maxItems: 2, discount: 0, label: 'No Discount' },
    { minItems: 3, maxItems: 4, discount: 10, label: '10% OFF' },
    { minItems: 5, maxItems: 5, discount: 15, label: '15% OFF' },
    { minItems: 6, maxItems: 9, discount: 25, label: '25% OFF' },
    { minItems: 10, maxItems: 10, discount: 30, label: '30% OFF' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // Update combo builder height on window resize and when selected products change
  useEffect(() => {
    const updateHeight = () => {
      if (comboBuilderRef.current) {
        setComboBuilderHeight(comboBuilderRef.current.offsetHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [selectedProducts]);

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

  const handleAddToCombo = (product: Product) => {
    // Check if product is customizable
    if (product.is_customizable) {
      setPendingProductToAdd(product);
      setShowCustomizationModal(true);
    } else {
      addProductToCombo(product);
    }
  };

  const addProductToCombo = (product: Product, customization?: CustomizationData) => {
    const totalItems = getTotalItems();
    
    // Check if adding this product would exceed the 10-item limit
    if (totalItems >= 10) {
      toast.error('Maximum 10 items allowed in a combo');
      return;
    }
    
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(product.id);
      if (existing) {
        // Check if increasing quantity would exceed limit
        if (totalItems + 1 > 10) {
          toast.error('Maximum 10 items allowed in a combo');
          return prev;
        }
        newMap.set(product.id, { 
          product, 
          quantity: existing.quantity + 1,
          customization: customization || existing.customization 
        });
      } else {
        newMap.set(product.id, { product, quantity: 1, customization });
      }
      return newMap;
    });
    
    if (customization) {
      toast.success(`${product.name} (customized) added to combo`);
    } else {
      toast.success(`${product.name} added to combo`);
    }
  };

  const handleCustomizationComplete = (product: Product, customization: CustomizationData) => {
    addProductToCombo(product, customization);
    setShowCustomizationModal(false);
    setPendingProductToAdd(null);
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
    
    const totalItems = getTotalItems();
    const currentItem = selectedProducts.get(productId);
    const currentQuantity = currentItem?.quantity || 0;
    const quantityDiff = quantity - currentQuantity;
    
    // Check if updating quantity would exceed limit
    if (totalItems + quantityDiff > 10) {
      toast.error('Maximum 10 items allowed in a combo');
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

  const editCustomization = (productId: string) => {
    const item = selectedProducts.get(productId);
    if (item && item.product.is_customizable) {
      setPendingProductToAdd(item.product);
      // Remove the item first, then open customization modal
      removeFromCombo(productId);
      setShowCustomizationModal(true);
    }
  };

  const getTotalItems = (): number => {
    let total = 0;
    selectedProducts.forEach(item => {
      total += item.quantity;
    });
    return total;
  };

  const getCurrentDiscountTier = () => {
    const totalItems = getTotalItems();
    return discountTiers.find(tier => 
      totalItems >= tier.minItems && totalItems <= tier.maxItems
    ) || discountTiers[0];
  };

  const calculateSubtotal = () => {
    let total = 0;
    selectedProducts.forEach(item => {
      const itemPrice = item.product.price + (item.product.customization_price || 0);
      total += itemPrice * item.quantity;
    });
    return total;
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    const tier = getCurrentDiscountTier();
    return (subtotal * tier.discount) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const getNextDiscountTier = () => {
    const totalItems = getTotalItems();
    return discountTiers.find(tier => tier.minItems > totalItems);
  };

  const handleAddToCart = () => {
    if (selectedProducts.size === 0) {
      toast.error('Please add at least one product to your combo');
      return;
    }

    try {
      // Create a unique combo ID
      const comboId = `combo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const defaultComboName = `Custom Combo (${new Date().toLocaleDateString()})`;
      const finalComboName = comboName.trim() || defaultComboName;
      
      // Prepare combo products array
      const comboProducts = Array.from(selectedProducts.values()).map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price + (item.product.customization_price || 0),
        image_url: item.product.image_url,
        customization: item.customization
      }));

      // Get first product image for combo thumbnail
      const firstProduct = Array.from(selectedProducts.values())[0]?.product;
      
      // Create a single cart item for the entire combo
      const comboCartItem: ComboCartItem = {
        id: comboId,
        name: finalComboName,
        price: calculateTotal(),
        quantity: 1,
        image_url: firstProduct?.image_url || '',
        type: 'combo',
        combo_id: comboId,
        combo_name: finalComboName,
        is_combo_item: true,
        combo_products: comboProducts,
        description: `Custom combo with ${selectedProducts.size} product${selectedProducts.size > 1 ? 's' : ''}`
      };

      // Add the single combo item to cart
      addItem(comboCartItem);

      toast.success(
        <div>
          <strong className="text-base">🎁 Combo added to cart!</strong>
          <p className="text-sm mt-1 font-medium">{finalComboName}</p>
          <p className="text-xs mt-1 text-gray-600">
            {selectedProducts.size} items • {formatCurrency(calculateTotal())}
          </p>
        </div>
      );
      
      // Clear the combo
      setSelectedProducts(new Map());
      setComboName('');
      setSpecialRequests('');
      
    } catch (error) {
      console.error('Error adding combo to cart:', error);
      toast.error('Failed to add combo to cart');
    }
  };

  const filteredProducts = getFilteredProducts();
  const displayProducts = showSearchResults ? searchResults : filteredProducts;
  const currentTier = getCurrentDiscountTier();
  const nextTier = getNextDiscountTier();
  const totalItems = getTotalItems();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-gold"></div>
      </div>
    );
  }

  // Combo Content (reused for both mobile and desktop)
  const renderComboContent = () => (
    <>
      {/* Discount Banner */}
      {totalItems > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-purple-700">Auto Discount Applied!</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Items:</span>
              <span className="font-medium">{totalItems} / 10</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount:</span>
              <span className="font-bold text-premium-gold">{currentTier.discount}% OFF</span>
            </div>
            {nextTier && (
              <div className="mt-2 p-2 bg-white rounded-lg text-xs">
                <p className="text-gray-600">
                  Add {nextTier.minItems - totalItems} more item{nextTier.minItems - totalItems > 1 ? 's' : ''} to get {nextTier.discount}% OFF!
                </p>
                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
                  <div 
                    className="bg-premium-gold h-1.5 rounded-full transition-all"
                    style={{ width: `${(totalItems / nextTier.minItems) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
      <div className="mb-4 max-h-[300px] overflow-y-auto">
        {selectedProducts.size === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Gift className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No products selected</p>
            <p className="text-sm text-gray-400">Add products from the list below</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(selectedProducts.values()).map(({ product, quantity, customization }) => {
              const itemPrice = product.price + (product.customization_price || 0);
              
              return (
                <div key={product.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-gray-500">{formatCurrency(itemPrice)} each</p>
                      {customization && (
                        <div className="flex items-center gap-1 mt-1">
                          {customization.text_lines && customization.text_lines.length > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              <Type className="h-3 w-3 inline mr-1" />
                              {customization.text_lines.length} line{customization.text_lines.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {customization.image_urls && customization.image_urls.length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              <ImageIcon className="h-3 w-3 inline mr-1" />
                              {customization.image_urls.length} image{customization.image_urls.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
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
                        disabled={totalItems >= 10}
                        className="p-1 hover:bg-white rounded disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      {product.is_customizable && (
                        <button
                          onClick={() => editCustomization(product.id)}
                          className="p-1 hover:bg-white rounded text-blue-600"
                          title="Edit Customization"
                        >
                          <Type className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => removeFromCombo(product.id)}
                        className="p-1 hover:bg-white rounded text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      {selectedProducts.size > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(calculateSubtotal())}</span>
          </div>
          {currentTier.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({currentTier.discount}%):</span>
              <span>-{formatCurrency(calculateDiscount())}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Total:</span>
            <span className="text-2xl font-bold text-premium-gold">
              {formatCurrency(calculateTotal())}
            </span>
          </div>
        </div>
      )}

      {/* Special Requests */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Special Requests</label>
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          rows={2}
          placeholder="Gift wrapping, personalized message, etc."
          className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
        />
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={selectedProducts.size === 0}
        className="w-full py-4 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="h-5 w-5" />
        {selectedProducts.size === 0 ? (
          'Select Products to Continue'
        ) : (
          `Add Combo to Cart • ${formatCurrency(calculateTotal())}`
        )}
      </button>

      {/* Items Counter */}
      <p className="text-center text-xs text-gray-500 mt-4">
        {totalItems} / 10 items selected
      </p>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* Customization Modal */}
        {showCustomizationModal && pendingProductToAdd && (
          <ProductCustomizationModal
            product={pendingProductToAdd}
            onClose={() => {
              setShowCustomizationModal(false);
              setPendingProductToAdd(null);
            }}
            onCustomizeComplete={(customization) => 
              handleCustomizationComplete(pendingProductToAdd, customization)
            }
          />
        )}

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
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-premium-charcoal mb-4">
            Create Your Custom Combo
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Mix and match products to create the perfect gift combination
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile/Tablet: Combo Builder at Top, Products at Bottom */}
          {/* Desktop: Products on Left, Combo Builder on Right */}
          
          {/* Combo Builder - Mobile First (Top), Desktop (Right) */}
          <div className="order-1 lg:order-2 lg:w-[380px] xl:w-[420px]">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                <Package className="h-5 w-5 text-premium-gold" />
                Your Combo
              </h2>
              {renderComboContent()}
            </div>
          </div>

          {/* Product Selection - Mobile (Bottom), Desktop (Left) */}
          <div className="order-2 lg:order-1 lg:flex-1">
            {/* Search Bar */}
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

            {/* Navigation */}
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

            {/* Categories Grid */}
{!selectedCategory && !showSearchResults && (
  <section className="mb-8">
    <h2 className="text-2xl font-serif font-bold mb-6">Choose a Category</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {categories.map((category) => {
        // Calculate product count for this category
        const productCount = products.filter(product => {
          // Check if product has categories array (new structure)
          if (product.categories && Array.isArray(product.categories)) {
            return product.categories.some((cat: any) => 
              cat.id === category.id || cat.name === category.name
            );
          }
          // Fallback to old category field
          return product.category === category.name;
        }).length;

        console.log(`Category "${category.name}" has ${productCount} products`); // Debug log

        return (
          <CategoryCard
            key={category.id}
            name={category.name}
            icon={category.icon || '🎁'}
            icon_type={category.icon_type || 'emoji'}
            color={category.color || 'from-premium-gold/20 to-premium-cream'}
            hover_effect={category.hover_effect}
            count={productCount}
            onClick={() => handleCategorySelect(category)}
          />
        );
      })}
    </div>
  </section>
)}

            {/* Gender Filter */}
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
            <section className="mb-20 lg:mb-0">
              <h2 className="text-2xl font-serif font-bold mb-6">
                {showSearchResults ? 'Search Results' : 'Select Products'}
              </h2>
              {displayProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayProducts.map((product) => {
                    const finalPrice = product.price + (product.customization_price || 0);
                    const isInCombo = selectedProducts.has(product.id);
                    
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-xl p-4 hover:border-premium-gold transition-all ${
                          isInCombo ? 'border-premium-gold bg-premium-cream/20' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium line-clamp-1">{product.name}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                              {product.description}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <div>
                                <span className="text-premium-gold font-bold">
                                  {formatCurrency(finalPrice)}
                                </span>
                                {product.is_customizable && (
                                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                    Customizable
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleAddToCombo(product)}
                                disabled={totalItems >= 10 && !isInCombo}
                                className={`px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isInCombo
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-premium-gold text-white hover:bg-premium-burgundy'
                                }`}
                              >
                                {isInCombo ? 'Added' : 'Add'}
                              </button>
                            </div>
                            <div className="flex gap-2 mt-2 flex-wrap">
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
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No products found</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCombo;