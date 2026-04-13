import React, { useEffect } from 'react';
import { X, Minus, Plus, ShoppingBag, Palette, Ruler } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { Link } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('cartDrawerStateChange', { detail: { isOpen: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('cartDrawerStateChange', { detail: { isOpen: false } }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white z-50 shadow-2xl animate-slide-up">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="h-6 w-6 text-premium-gold" />
              <h2 className="text-xl font-serif font-semibold">Your Cart</h2>
              <span className="bg-premium-gold text-white text-sm px-2 py-1 rounded-full">
                {items.length} items
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-premium-cream rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Your cart is empty</p>
                <Link
                  to="/products"
                  onClick={onClose}
                  className="mt-4 inline-block px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex flex-col p-4 bg-premium-cream/30 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        {/* Color and Size indicators */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {item.color_code && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-3 h-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: item.color_code }}
                                title={item.color_name}
                              />
                              {item.color_name && (
                                <span className="text-xs text-gray-600">{item.color_name}</span>
                              )}
                            </div>
                          )}
                          {item.size_name && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Ruler className="h-3 w-3" />
                              <span>{item.size_name}</span>
                            </div>
                          )}
                        </div>
                        
                        <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                        
                        {item.type === 'combo' && (
                          <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            Custom Combo
                          </span>
                        )}
                        
                        {item.customization && (
                          <div className="flex gap-1 mt-1">
                            {item.customization.text_lines?.length ? (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                                {item.customization.text_lines.length} text
                              </span>
                            ) : null}
                            {item.customization.image_urls?.length ? (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                {item.customization.image_urls.length} image
                              </span>
                            ) : null}
                          </div>
                        )}
                        
                        <p className="text-premium-gold font-semibold mt-1">
                          {formatCurrency(item.price)}
                        </p>
                        
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-white rounded"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-white rounded"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {item.type === 'combo' && (item as any).combo_products && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3" />
                          Includes:
                        </p>
                        <div className="space-y-2">
                          {(item as any).combo_products.map((cp: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <img
                                src={getImageUrl(cp.image_url)}
                                alt={cp.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-xs">{cp.name}</p>
                                <p className="text-xs text-gray-600">
                                  Qty: {cp.quantity} × {formatCurrency(cp.price)}
                                </p>
                              </div>
                              <p className="text-xs font-medium">
                                {formatCurrency(cp.price * cp.quantity)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t p-6 space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-premium-gold">{formatCurrency(total)}</span>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={clearCart}
                  className="flex-1 px-4 py-3 border border-premium-gold text-premium-gold rounded-lg hover:bg-premium-gold/10 transition-colors"
                >
                  Clear All
                </button>
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors text-center font-medium"
                >
                  Checkout Now
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDrawer;