import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, PenTool } from 'lucide-react';
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
  const [purchaseCount, setPurchaseCount] = useState<number>(() => {
    if (product.social_proof_enabled) {
      const initial = product.social_proof_initial_count || 5;
      const end = product.social_proof_end_count || 15;
      return Math.floor(Math.random() * (end - initial + 1)) + initial;
    }
    return 0;
  });

  useEffect(() => {
    const fetchSocialProof = async () => {
      try {
        const data = await apiFetch(`/api/social-proof/${product.id}`).catch(() => null);
        if (data && data.is_enabled) {
          if (data.count) {
            setPurchaseCount(data.count);
          }
          
          await apiFetch('/api/social-proof/track-view', {
            method: 'POST',
            body: JSON.stringify({ product_id: product.id })
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Error fetching social proof:', error);
      }
    };

    if (product.social_proof_enabled) {
      fetchSocialProof();
      
      const interval = setInterval(() => {
        setPurchaseCount(prev => {
          const initial = product.social_proof_initial_count || 5;
          const end = product.social_proof_end_count || 15;
          return Math.floor(Math.random() * (end - initial + 1)) + initial;
        });
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [product.id, product.social_proof_enabled, product.social_proof_initial_count, product.social_proof_end_count]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent opening modal if clicking on the add to cart button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setShowDetails(true);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (product.social_proof_enabled) {
      apiFetch('/api/social-proof/track-purchase', {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id })
      }).catch(() => {});
    }

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

  const handleCustomizeFromModal = () => {
    setShowDetails(false);
    setShowCustomization(true);
  };

  return (
    <>
      <div 
        className="group bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-premium-gold/10 cursor-pointer"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setShowDetails(true);
          }
        }}
      >
        <div className="relative overflow-hidden aspect-square">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={getImageUrl(product.image_url)}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          
          {/* Discount Badge */}
          {product.discount_percentage && product.discount_percentage > 0 && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-premium-burgundy text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg z-10">
              -{product.discount_percentage}%
            </div>
          )}
          
          {/* Customizable Badge */}
          {product.is_customizable && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-purple-600 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg flex items-center gap-0.5 z-10">
              <PenTool className="h-2.5 w-2.5" />
              <span className="hidden xs:inline">Custom</span>
            </div>
          )}
        </div>
        
        {/* Social Proof Banner */}
        {product.social_proof_enabled && (
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
              {product.original_price && product.original_price > product.price && (
                <p className="text-[8px] sm:text-[10px] text-gray-500 line-through">
                  {formatCurrency(product.original_price)}
                </p>
              )}
            </div>
            
            {/* Add to Cart Button */}
            <button
              onClick={handleQuickAdd}
              className="p-1.5 sm:p-2 bg-premium-gold/10 text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors z-20 relative"
              title="Add to cart"
            >
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <ProductDetailsModal
          product={product}
          onClose={() => setShowDetails(false)}
          onCustomize={product.is_customizable ? handleCustomizeFromModal : undefined}
        />
      )}

      {/* Customization Modal */}
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