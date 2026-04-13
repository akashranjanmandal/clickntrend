import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Star, PenTool, Sparkles, Palette, Ruler, Eye, ChevronRight, Zap, Gem, Shield } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import ProductCustomizationModal from './ProductCustomizationModal';
import { apiFetch, uploadFetch } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [showCustomization, setShowCustomization] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [socialProof, setSocialProof] = useState<SocialProofData | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0
  });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    product.has_colors && product.colors && product.colors.length > 0 
      ? product.colors.find(c => c.is_active)?.id || null 
      : null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.has_sizes && product.sizes && product.sizes.length > 0 
      ? product.sizes.find(s => s.is_active)?.id || null 
      : null
  );
  const [isHovered, setIsHovered] = useState(false);
  const [cardImgIdx, setCardImgIdx] = useState(0);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSocialProof();
    fetchReviewStats();
    
    const interval = setInterval(() => {
      fetchSocialProof();
      fetchReviewStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [product.id]);

  // Auto-slide images on hover - uses product image count to avoid forward reference
  const totalImages = 1 + (product.additional_images?.length || 0);
  useEffect(() => {
    if (isHovered && totalImages > 1) {
      autoSlideRef.current = setInterval(() => {
        setCardImgIdx(p => (p + 1) % totalImages);
      }, 1800);
    } else {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
      if (!isHovered) setCardImgIdx(0);
    }
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  }, [isHovered, totalImages]);

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

  const fetchReviewStats = async () => {
    setLoadingReviews(true);
    try {
      const data = await apiFetch(`/api/reviews/product/${product.id}`).catch(() => []);
      
      console.log(`Reviews for product ${product.id}:`, data); // Debug log
      
      if (data && Array.isArray(data)) {
        const approvedReviews = data.filter((r: any) => r.is_approved);
        const totalReviews = approvedReviews.length;
        const averageRating = totalReviews > 0
          ? approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
          : 0;
        
        setReviewStats({
          averageRating,
          totalReviews
        });
        
        console.log(`Product ${product.id} review stats:`, { totalReviews, averageRating }); // Debug log
      } else {
        setReviewStats({ averageRating: 0, totalReviews: 0 });
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
      setReviewStats({ averageRating: 0, totalReviews: 0 });
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleShowMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/product/${product.id}`);
  };

  const getSelectedColorData = () => {
    return product.colors?.find(c => c.id === selectedColor);
  };

  // Build all images for this card (colour variants + additional_images) — placed after getSelectedColorData
  const allCardImages = (() => {
    const imgs: string[] = [];
    const selColor = product.colors?.find(c => c.id === selectedColor);
    if (selColor?.image_url) {
      imgs.push(selColor.image_url);
      if (selColor.additional_images) imgs.push(...selColor.additional_images);
    } else {
      imgs.push(product.image_url);
      if (product.additional_images) imgs.push(...product.additional_images);
    }
    return imgs.filter(Boolean);
  })();

  const getSelectedSizeData = () => {
    return product.sizes?.find(s => s.id === selectedSize);
  };

  const getCurrentPrice = () => {
    let price = product.price;
    const selectedColorData = getSelectedColorData();
    const selectedSizeData = getSelectedSizeData();
    
    if (selectedColorData) {
      price += selectedColorData.price_modifier;
    }
    if (selectedSizeData) {
      price += selectedSizeData.price_modifier;
    }
    return price;
  };

  const getCurrentImage = () => {
    if (allCardImages.length > 0 && cardImgIdx < allCardImages.length) {
      return allCardImages[cardImgIdx];
    }
    const selectedColorData = getSelectedColorData();
    return selectedColorData?.image_url || product.image_url;
  };

  const getProductName = () => {
    let name = product.name;
    const parts = [];
    const selectedColorData = getSelectedColorData();
    const selectedSizeData = getSelectedSizeData();
    
    if (selectedColorData) {
      parts.push(selectedColorData.color_name);
    }
    if (selectedSizeData) {
      parts.push(selectedSizeData.size_name);
    }
    if (parts.length > 0) {
      name += ` (${parts.join(', ')})`;
    }
    return name;
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const finalPrice = getCurrentPrice();
    const productImage = getCurrentImage();
    const productName = getProductName();
    const selectedColorData = getSelectedColorData();
    const selectedSizeData = getSelectedSizeData();
    
    if (product.social_proof_enabled) {
      try {
        await apiFetch('/api/social-proof/track-purchase', {
          method: 'POST',
          body: JSON.stringify({ product_id: product.id })
        }).catch(() => {});
        
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
      id: `${product.id}-${selectedColor || ''}-${selectedSize || ''}-${Date.now()}`,
      name: productName,
      price: finalPrice,
      quantity: 1,
      image_url: productImage,
      type: 'product',
      category: product.category,
      color_id: selectedColor || undefined,
      color_name: selectedColorData?.color_name,
      color_code: selectedColorData?.color_code,
      size_id: selectedSize || undefined,
      size_name: selectedSizeData?.size_name,
      size_code: selectedSizeData?.size_code
    });
  };

  const handleCustomizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowCustomization(true);
  };

  const handleCustomizeFromModal = () => {
    navigate(`/product/${product.id}`);
  };

  const activeColors = product.has_colors && product.colors 
    ? product.colors.filter(c => c.is_active) 
    : [];
  const activeSizes = product.has_sizes && product.sizes 
    ? product.sizes.filter(s => s.is_active) 
    : [];

  // Glow effect variants
  const glowVariants = {
    hover: {
      boxShadow: "0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.1)",
      transition: { duration: 0.3 }
    }
  };

  const shineVariants = {
    hover: {
      x: ["0%", "100%"],
      transition: { duration: 0.6, ease: "easeInOut" }
    }
  };

  return (
    <>
      <motion.div 
        className="group relative bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl overflow-hidden cursor-pointer"
        onClick={() => navigate(`/product/${product.id}`)}
        role="button"
        tabIndex={0}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        variants={glowVariants}
        whileHover="hover"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/product/${product.id}`);
          }
        }}
      >
        {/* Premium Border Gradient */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-premium-gold/20 via-transparent to-premium-gold/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Animated Shine Effect */}
        <motion.div
          variants={shineVariants}
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
        />
        
        {/* Card Content */}
        <div className="relative">
          <div className="relative overflow-hidden aspect-square">
            {/* Premium Gradient Overlay on Hover */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
              initial={false}
              animate={{ opacity: isHovered ? 1 : 0 }}
            />
            
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
            )}
            
            <motion.img
              src={getImageUrl(getCurrentImage())}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-700 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isHovered ? 'scale-110' : 'scale-100'}`}
              onLoad={() => setImageLoaded(true)}
              animate={{ scale: isHovered ? 1.1 : 1 }}
              transition={{ duration: 0.6 }}
            />

            {/* Auto-slide dots */}
            {allCardImages.length > 1 && isHovered && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                {allCardImages.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all duration-300 ${i === cardImgIdx ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
                ))}
              </div>
            )}
            
            {/* Discount Badge with Animation */}
            {product.discount_percentage && product.discount_percentage > 0 && (
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="absolute top-3 left-3 z-20"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-premium-burgundy rounded-full blur-md opacity-50" />
                  <div className="relative bg-gradient-to-r from-premium-burgundy to-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    -{product.discount_percentage}%
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Customizable Badge */}
            {product.is_customizable && (
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="absolute top-3 right-3 z-20"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-600 rounded-full blur-md opacity-50" />
                  <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <PenTool className="h-3 w-3" />
                    <span className="hidden xs:inline">Custom</span>
                  </div>
                </div>
              </motion.div>
            )}
     
            {/* Variant badges with Animation */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between z-10">
              {product.has_colors && activeColors.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1"
                >
                  <Palette className="h-3 w-3" />
                  {activeColors.length} {activeColors.length === 1 ? 'Color' : 'Colors'}
                </motion.div>
              )}
              
              {product.has_sizes && activeSizes.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1"
                >
                  <Ruler className="h-3 w-3" />
                  {activeSizes.length} {activeSizes.length === 1 ? 'Size' : 'Sizes'}
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Social Proof Banner */}
          {product.social_proof_enabled && socialProof && socialProof.count > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-r from-orange-50 to-red-50 px-3 py-2 border-b border-premium-gold/10"
            >
              <p className="text-xs text-premium-burgundy font-medium flex items-center gap-2">
                <motion.span 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="relative flex h-2 w-2"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </motion.span>
                {socialProof.text_template.replace('{count}', socialProof.count.toString())}
              </p>
            </motion.div>
          )}
          
          <div className="p-4">
            {/* Title */}
            <h3 className="font-serif text-sm font-semibold text-premium-charcoal line-clamp-1 mb-2">
              {product.name}
            </h3>
            
            {/* Rating and Reviews - FIXED */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= Math.round(reviewStats.averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                {!loadingReviews && (
                  <>
                    <span className="text-xs font-medium text-gray-700 ml-1">
                      {reviewStats.averageRating > 0 ? reviewStats.averageRating.toFixed(1) : '0.0'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({reviewStats.totalReviews})
                    </span>
                  </>
                )}
                {loadingReviews && (
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse ml-1"></div>
                )}
              </div>
            </div>
            
            <p className="text-gray-500 text-xs mb-3 line-clamp-2">
              {product.description}
            </p>

            {/* Color Options with Animation */}
            {product.has_colors && activeColors.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {activeColors.slice(0, 5).map((color, idx) => (
                    <motion.button
                      key={color.id}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedColor(color.id);
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        selectedColor === color.id 
                          ? 'border-premium-gold shadow-lg shadow-premium-gold/50 scale-110' 
                          : 'border-gray-300 hover:border-premium-gold'
                      }`}
                      style={{ backgroundColor: color.color_code || '#ccc' }}
                      title={color.color_name}
                    />
                  ))}
                  {activeColors.length > 5 && (
                    <span className="text-[10px] text-gray-500 ml-1">+{activeColors.length - 5}</span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Size Options */}
            {product.has_sizes && activeSizes.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {activeSizes.slice(0, 4).map((size, idx) => (
                    <motion.button
                      key={size.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSize(size.id);
                      }}
                      className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                        selectedSize === size.id 
                          ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white border-transparent shadow-md' 
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-premium-gold'
                      }`}
                    >
                      {size.size_code || size.size_name}
                    </motion.button>
                  ))}
                  {activeSizes.length > 4 && (
                    <span className="text-[10px] text-gray-500">+{activeSizes.length - 4}</span>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Price and Add to Cart Button */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <div>
                <motion.p 
                  whileHover={{ scale: 1.05 }}
                  className="text-base font-bold bg-gradient-to-r from-premium-gold to-yellow-500 bg-clip-text text-transparent"
                >
                  {formatCurrency(getCurrentPrice())}
                </motion.p>
                {product.original_price && product.original_price > product.price && (
                  <p className="text-[10px] text-gray-400 line-through">
                    {formatCurrency(product.original_price)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {showCustomization && (
        <ProductCustomizationModal
          product={product}
          selectedImageUrl={getSelectedColorData()?.image_url || product.image_url}
          onClose={() => setShowCustomization(false)}
        />
      )}
    </>
  );
};

export default ProductCard;