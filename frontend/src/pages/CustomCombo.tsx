import React, { useState, useEffect } from 'react';
import { Plus, X, Package, Check, Minus, ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/helpers';
import { CONFIG } from '../config';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const CustomCombo: React.FC = () => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Array<Product & { quantity: number }>>([]);
  const [comboName, setComboName] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addToCombo = (product: Product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p =>
          p.id === product.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCombo = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCombo(productId);
      return;
    }
    setSelectedProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, quantity } : p))
    );
  };

  const totalPrice = selectedProducts.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0
  );

  const saveCombo = async () => {
    if (selectedProducts.length === 0) {
      alert('Please add at least one product to create a combo');
      return;
    }

    setLoading(true);
    try {
      const comboData = {
        name: comboName || 'My Custom Combo',
        description: 'Custom gift combo created by user',
        products: selectedProducts.map(p => ({
          id: p.id,
          quantity: p.quantity
        })),
        total_price: totalPrice,
        special_requests: specialRequests
      };

      const response = await fetch(`${CONFIG.API_URL}/api/combos/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comboData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the custom combo to cart
        addItem({
          id: data.combo.id,
          name: comboName || 'Custom Combo',
          price: totalPrice,
          quantity: 1,
          image_url: selectedProducts[0]?.image_url || '',
          type: 'custom',
        });
        
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          // Redirect to checkout
          navigate('/checkout');
        }, 1500);
        
        // Reset form
        setSelectedProducts([]);
        setComboName('');
        setSpecialRequests('');
      }
    } catch (error) {
      console.error('Error saving combo:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCartAndCheckout = () => {
    if (selectedProducts.length === 0) {
      alert('Please add at least one product to create a combo');
      return;
    }

    // Add to cart immediately
    const comboItem = {
      id: `custom-${Date.now()}`,
      name: comboName || 'Custom Combo',
      price: totalPrice,
      quantity: 1,
      image_url: selectedProducts[0]?.image_url || '',
      type: 'custom' as const,
      description: `Custom combo with ${selectedProducts.length} items`
    };
    
    addItem(comboItem);
    navigate('/checkout');
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-4">
            Create Your <span className="text-premium-gold">Custom Combo</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 px-4">
            Mix and match products to create the perfect gift combination
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Product Selection - Mobile Scrollable */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-serif font-semibold mb-4 md:mb-6">
                Available Products
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-h-[500px] overflow-y-auto pr-2">
                {products.slice(0, 8).map(product => (
                  <div
                    key={product.id}
                    className="border rounded-lg md:rounded-xl p-3 md:p-4 hover:border-premium-gold transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm md:text-base line-clamp-1 pr-2">{product.name}</h4>
                        <p className="text-premium-gold font-semibold text-sm md:text-base">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => addToCombo(product)}
                        className="p-1.5 md:p-2 bg-premium-cream hover:bg-premium-gold hover:text-white rounded-lg transition-colors flex-shrink-0"
                        aria-label="Add to combo"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Combo Builder - Sticky on Mobile/Desktop */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 sticky top-20 md:top-24">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">Your Combo</h2>
                <div className="flex items-center space-x-2 bg-premium-cream px-3 py-1.5 rounded-full">
                  <Package className="h-4 w-4 md:h-5 md:w-5 text-premium-gold" />
                  <span className="font-semibold text-sm md:text-base">
                    {selectedProducts.length}
                  </span>
                </div>
              </div>

              {/* Combo Name */}
              <div className="mb-4 md:mb-6">
                <label className="block text-sm font-medium mb-2">
                  Combo Name (Optional)
                </label>
                <input
                  type="text"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="e.g., Anniversary Special"
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>

              {/* Selected Products - Mobile Optimized */}
              <div className="mb-4 md:mb-6">
                <h3 className="font-medium mb-3">Selected Items</h3>
                {selectedProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-6 md:py-8 text-sm md:text-base bg-premium-cream/30 rounded-lg">
                    No items added yet. Select products from the list.
                  </p>
                ) : (
                  <div className="space-y-2 md:space-y-3 max-h-[300px] md:max-h-64 overflow-y-auto pr-1">
                    {selectedProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 md:p-3 bg-premium-cream/30 rounded-lg"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-medium text-sm md:text-base line-clamp-1">{product.name}</h4>
                          <p className="text-xs md:text-sm text-gray-600">
                            {formatCurrency(product.price)} × {product.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
                          <div className="flex items-center space-x-1 md:space-x-2">
                            <button
                              onClick={() => updateQuantity(product.id, product.quantity - 1)}
                              className="p-1 hover:bg-white rounded"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </button>
                            <span className="w-6 md:w-8 text-center text-sm md:text-base">{product.quantity}</span>
                            <button
                              onClick={() => updateQuantity(product.id, product.quantity + 1)}
                              className="p-1 hover:bg-white rounded"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCombo(product.id)}
                            className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-red-500"
                            aria-label="Remove item"
                          >
                            <X className="h-3 w-3 md:h-4 md:w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Requests */}
              <div className="mb-4 md:mb-6">
                <label className="block text-sm font-medium mb-2">
                  Special Requests
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Gift wrapping, messages, delivery instructions..."
                  rows={2}
                  className="w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>

              {/* Total & Actions */}
              <div className="border-t pt-4 md:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Total Value</p>
                    <p className="text-2xl md:text-3xl font-bold text-premium-gold">
                      {formatCurrency(totalPrice)}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={saveCombo}
                      disabled={loading || selectedProducts.length === 0}
                      className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium text-sm md:text-base flex items-center justify-center space-x-2 ${
                        loading || selectedProducts.length === 0
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-premium-gold hover:bg-premium-burgundy text-white'
                      }`}
                    >
                      {saved ? (
                        <>
                          <Check className="h-4 w-4 md:h-5 md:w-5" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <span>{loading ? 'Saving...' : 'Save Combo'}</span>
                      )}
                    </button>
                    <button
                      onClick={addToCartAndCheckout}
                      disabled={selectedProducts.length === 0}
                      className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium text-sm md:text-base flex items-center justify-center space-x-2 ${
                        selectedProducts.length === 0
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-premium-burgundy hover:bg-premium-charcoal text-white'
                      }`}
                    >
                      <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                      <span>Add to Cart & Checkout</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs md:text-sm text-gray-500 text-center sm:text-left">
                  Your custom combo will be added to cart for checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCombo;