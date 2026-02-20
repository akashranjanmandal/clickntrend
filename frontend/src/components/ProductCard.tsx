import React, { useState } from 'react';
import { ShoppingCart, Star, Eye } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import ProductDetailsModal from './ProductDetailsModal';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const [showDetails, setShowDetails] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      type: 'product',
      category: product.category
    });
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetails(true);
  };

  return (
    <>
      <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-premium-gold/10">
        <div className="relative overflow-hidden aspect-square">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={getImageUrl(product.image_url)}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          {product.discount_percentage && (
            <div className="absolute top-4 left-4 bg-premium-burgundy text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
              -{product.discount_percentage}%
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/70 via-black/50 to-transparent p-4">
            <div className="flex gap-2">
              <button
                onClick={handleViewDetails}
                className="flex-1 px-4 py-2 bg-white/90 backdrop-blur-sm text-premium-charcoal rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Quick View
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-serif text-lg font-semibold text-premium-charcoal line-clamp-1">
              {product.name}
            </h3>
            <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="text-xs font-medium text-gray-700">4.8</span>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-premium-gold">
                {formatCurrency(product.price)}
              </p>
              {product.original_price && (
                <p className="text-xs text-gray-500 line-through">
                  {formatCurrency(product.original_price)}
                </p>
              )}
            </div>
            
            <button
              onClick={handleAddToCart}
              className="px-4 py-2 bg-premium-gold/10 text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium text-sm"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {showDetails && (
        <ProductDetailsModal
          product={product}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
};

export default ProductCard;