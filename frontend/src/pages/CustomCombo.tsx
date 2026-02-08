import React, { useState, useEffect } from 'react';
import { Plus, X, Package, Check, Minus } from 'lucide-react'; // Import Minus here
import { Product } from '../types';
import { formatCurrency } from '../utils/helpers';
import { CONFIG } from '../config';

const CustomCombo: React.FC = () => {
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
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
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

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold mb-4">
            Create Your <span className="text-premium-gold">Custom Combo</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Mix and match products to create the perfect gift combination
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Selection */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-6">
                Available Products
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {products.slice(0, 8).map(product => (
                  <div
                    key={product.id}
                    className="border rounded-xl p-4 hover:border-premium-gold transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium line-clamp-1">{product.name}</h4>
                        <p className="text-premium-gold font-semibold">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => addToCombo(product)}
                        className="p-2 bg-premium-cream hover:bg-premium-gold hover:text-white rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Combo Builder */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-semibold">Your Combo</h2>
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-premium-gold" />
                  <span className="font-semibold">
                    {selectedProducts.length} items
                  </span>
                </div>
              </div>

              {/* Combo Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Combo Name (Optional)
                </label>
                <input
                  type="text"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="e.g., Anniversary Special Gift Set"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>

              {/* Selected Products */}
              <div className="mb-6">
                <h3 className="font-medium mb-4">Selected Items</h3>
                {selectedProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No items added yet. Select products from the left panel.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-premium-cream/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(product.price)} × {product.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(product.id, product.quantity - 1)}
                              className="p-1 hover:bg-white rounded"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center">{product.quantity}</span>
                            <button
                              onClick={() => updateQuantity(product.id, product.quantity + 1)}
                              className="p-1 hover:bg-white rounded"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCombo(product.id)}
                            className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Requests */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Special Requests
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special instructions, gift wrapping preferences, or messages..."
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>

              {/* Total & Save */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-3xl font-bold text-premium-gold">
                      {formatCurrency(totalPrice)}
                    </p>
                  </div>
                  <button
                    onClick={saveCombo}
                    disabled={loading || selectedProducts.length === 0}
                    className={`px-8 py-3 rounded-lg font-medium flex items-center space-x-2 ${
                      loading || selectedProducts.length === 0
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-premium-gold hover:bg-premium-burgundy text-white'
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <span>{loading ? 'Saving...' : 'Save Combo'}</span>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Your custom combo will be saved and available for checkout. 
                  Our team will review any special requests before processing.
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