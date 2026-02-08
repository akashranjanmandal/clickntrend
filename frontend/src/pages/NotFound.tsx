import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency, getImageUrl } from '../utils/helpers';

const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-premium-cream rounded-full mb-6">
            <ShoppingBag className="h-12 w-12 text-premium-gold" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">
            Add some beautiful gifts to make someone's day special
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products"
              className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
            >
              Browse Products
            </Link>
            <Link
              to="/custom-combo"
              className="px-6 py-3 border border-premium-gold text-premium-gold rounded-lg hover:bg-premium-gold/10 transition-colors"
            >
              Create Custom Combo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-serif font-bold">
            Shopping <span className="text-premium-gold">Cart</span>
          </h1>
          <Link
            to="/products"
            className="flex items-center space-x-2 text-premium-gold hover:text-premium-burgundy"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img
                      src={getImageUrl(item.image_url)}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-serif text-lg font-semibold">{item.name}</h3>
                      <p className="text-premium-gold font-bold text-lg mt-1">
                        {formatCurrency(item.price)}
                      </p>
                      <div className="flex items-center space-x-4 mt-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-50"
                          >
                            <span className="text-lg">−</span>
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-50"
                          >
                            <span className="text-lg">+</span>
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex items-center space-x-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {items.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <button
                    onClick={clearCart}
                    className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Clear All Items
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 className="text-2xl font-serif font-semibold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {total > 5000 ? 'FREE' : formatCurrency(200)}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-premium-gold">
                      {formatCurrency(total > 5000 ? total : total + 200)}
                    </span>
                  </div>
                  {total > 5000 && (
                    <p className="text-green-600 text-sm mt-2">
                      🎉 Free shipping applied!
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  to="/checkout"
                  className="block w-full py-3 bg-premium-gold text-white text-center rounded-lg hover:bg-premium-burgundy transition-colors font-medium"
                >
                  Proceed to Checkout
                </Link>
                <Link
                  to="/custom-combo"
                  className="block w-full py-3 border border-premium-gold text-premium-gold text-center rounded-lg hover:bg-premium-gold/10 transition-colors"
                >
                  Create Custom Combo
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-medium mb-4">Delivery Information</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Free shipping on orders above ₹5,000</li>
                  <li>• Express delivery available</li>
                  <li>• Gift wrapping at ₹199</li>
                  <li>• Order confirmation via email & SMS</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;