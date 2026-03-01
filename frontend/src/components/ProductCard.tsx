import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Eye, PenTool } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import ProductDetailsModal from './ProductDetailsModal';
import ProductCustomizationModal from './ProductCustomizationModal';
import { apiFetch } from '../config';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const [showDetails, setShowDetails] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [purchaseCount, setPurchaseCount] = useState(product.social_proof_count || 9);

  useEffect(() => {
    const fetchSocialProof = async () => {
      try {
        const data = await apiFetch(`/api/social-proof/${product.id}`).catch(() => null);
        if (data) {
          setPurchaseCount(data.count || product.social_proof_count || 9);
          await apiFetch('/api/social-proof/track-view', {
            method: 'POST',
            body: JSON.stringify({ product_id: product.id })
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Error fetching social proof:', error);
      }
    };

    if (product.social_proof_enabled !== false) {
      fetchSocialProof();
      
      const interval = setInterval(() => {
        setPurchaseCount(prev => {
          const variation = Math.floor(Math.random() * 3) - 1;
          const newCount = Math.max(5, prev + variation);
          return newCount;
        });
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [product.id]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (product.social_proof_enabled !== false) {
      apiFetch('/api/social-proof/track-purchase', {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id })
      }).catch(() => {});
    }

    if (product.is_customizable) {
      setShowCustomization(true);
    } else {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: product.image_url,
        type: 'product',
        category: product.category
      });
    }
  };

  return (
    <>
      <div className="group bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-premium-gold/10">
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
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-premium-burgundy text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg">
              -{product.discount_percentage}%
            </div>
          )}
          
          {product.is_customizable && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-purple-600 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg flex items-center gap-0.5">
              <PenTool className="h-2.5 w-2.5" />
              <span className="hidden xs:inline">Custom</span>
            </div>
          )}
          
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/70 via-black/50 to-transparent p-2 sm:p-3">
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={() => setShowDetails(true)}
                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm text-premium-charcoal rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium text-[10px] sm:text-xs flex items-center justify-center gap-1"
              >
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden xs:inline">Quick</span>
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-medium text-[10px] sm:text-xs flex items-center justify-center gap-1"
              >
                <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden xs:inline">{product.is_customizable ? 'Custom' : 'Add'}</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Social Proof Banner */}
        {product.social_proof_enabled !== false && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-2 sm:px-3 py-1 sm:py-1.5 border-b border-premium-gold/10">
            <p className="text-[10px] sm:text-xs text-premium-burgundy font-medium flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500"></span>
              </span>
              {purchaseCount} people viewing
            </p>
          </div>
        )}
        
        <div className="p-2 sm:p-3">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-serif text-xs sm:text-sm font-semibold text-premium-charcoal line-clamp-1">
              {product.name}
            </h3>
            <div className="flex items-center space-x-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-full">
              <Star className="h-2.5 w-2.5 text-yellow-400 fill-current" />
              <span className="text-[8px] sm:text-[10px] font-medium text-gray-700">4.8</span>
            </div>
          </div>
          
          <p className="text-gray-600 text-[10px] sm:text-xs mb-2 line-clamp-2">
            {product.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base font-bold text-premium-gold">
                {formatCurrency(product.price)}
              </p>
              {product.original_price && (
                <p className="text-[8px] sm:text-[10px] text-gray-500 line-through">
                  {formatCurrency(product.original_price)}
                </p>
              )}
            </div>
            
            <button
              onClick={handleAddToCart}
              className="px-2 sm:px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium text-[10px] sm:text-xs"
            >
              {product.is_customizable ? 'Customize' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <ProductDetailsModal
          product={product}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showCustomization && (
        <ProductCustomizationModal
          product={product}
          onClose={() => setShowCustomization(false)}
        />
      )}
    </>
  );
};

export default ProductCard;