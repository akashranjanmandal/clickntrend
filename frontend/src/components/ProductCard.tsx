import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, PenTool, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import ProductDetailsModal from './ProductDetailsModal';
import ProductCustomizationModal from './ProductCustomizationModal';
import SocialProof from './SocialProof';
import { apiFetch } from '../config';

interface ProductCardProps {
  product: Product;
}

interface SocialProofData {
  text_template: string;
  count: number;
  initial_count: number;
  end_count: number;
  is_enabled: boolean;
  stats: {
    views: number;
    purchases: number;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const [showDetails, setShowDetails] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [socialProof, setSocialProof] = useState<SocialProofData | null>(null);

  useEffect(() => {
    const fetchSocialProof = async () => {
      if (!product.social_proof_enabled) return;
      
      try {
        const data = await apiFetch(`/api/social-proof/${product.id}`).catch(() => null);
        if (data && data.is_enabled) {
          setSocialProof(data);
        }
      } catch (error) {
        console.error('Error fetching social proof:', error);
      }
    };

    fetchSocialProof();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSocialProof, 30000);

    return () => clearInterval(interval);
  }, [product.id, product.social_proof_enabled]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setShowDetails(true);
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track purchase
    if (product.social_proof_enabled) {
      try {
        await apiFetch('/api/social-proof/track-purchase', {
          method: 'POST',
          body: JSON.stringify({ product_id: product.id })
        }).catch(() => {});
        
        // Update local count
        setSocialProof(prev => {
          if (!prev) return prev;
          const newCount = Math.min(prev.count + 1, prev.end_count);
          return { ...prev, count: newCount };
        });
      } catch (error) {
        console.error('Error tracking purchase:', error);
      }
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

  const handleCustomizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCustomization(true);
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
        
        {/* Social Proof Banner inside card */}
        {product.social_proof_enabled && socialProof && socialProof.count > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-2 sm:px-3 py-1 sm:py-1.5 border-b border-premium-gold/10">
            <p className="text-[10px] sm:text-xs text-premium-burgundy font-medium flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500"></span>
              </span>
              {socialProof.text_template.replace('{count}', socialProof.count.toString())}
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
            
            {/* Conditional Button - Customize for customizable products, Add to Cart for others */}
            {product.is_customizable ? (
              <button
                onClick={handleCustomizeClick}
                className="p-1.5 sm:p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-600 hover:text-white transition-colors z-20 relative flex items-center gap-1"
                title="Customize this product"
              >
                <PenTool className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-[10px] sm:text-xs font-medium hidden sm:inline">Customize</span>
              </button>
            ) : (
              <button
                onClick={handleQuickAdd}
                className="p-1.5 sm:p-2 bg-premium-gold/10 text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors z-20 relative"
                title="Add to cart"
              >
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            )}
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