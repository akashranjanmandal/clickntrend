import React from 'react';
import { ShoppingCart, Star } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      type: 'product'
    });
  };

  return (
    <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-premium-gold/10">
      <div className="relative overflow-hidden">
        <img
          src={getImageUrl(product.image_url)}
          alt={product.name}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.discount_percentage && (
          <div className="absolute top-4 left-4 bg-premium-burgundy text-white px-3 py-1 rounded-full text-sm font-semibold">
            -{product.discount_percentage}%
          </div>
        )}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <ShoppingCart className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-lg font-semibold text-premium-charcoal line-clamp-1">
            {product.name}
          </h3>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="text-sm text-gray-600">4.8</span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-premium-charcoal">
              {formatCurrency(product.price)}
            </p>
            {product.original_price && (
              <p className="text-sm text-gray-500 line-through">
                {formatCurrency(product.original_price)}
              </p>
            )}
          </div>
          
          <button
            onClick={handleAddToCart}
            className="px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-medium"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;