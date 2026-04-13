import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ShoppingCart, Star, ChevronLeft, ChevronRight, 
  ThumbsUp, MessageCircle, PenTool, Truck,
  Package, Sparkles, Check, Ruler, Send, Filter, Share2, Copy, CheckCircle
} from 'lucide-react';
import { Product, Review, ProductColor, ProductSize } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, uploadFetch } from '../utils/api';
import toast from 'react-hot-toast';
import ProductCustomizationModal from './ProductCustomizationModal';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onCustomize?: () => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ 
  product, 
  onClose, 
  onCustomize 
}) => {
  const { addItem } = useCart();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [helpfulReviews, setHelpfulReviews] = useState<string[]>([]);
  
  // Variant states
  const [colors, setColors] = useState<ProductColor[]>(product.colors || []);
  const [sizes, setSizes] = useState<ProductSize[]>(product.sizes || []);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const reviewFormRef = useRef<HTMLDivElement>(null);

  const [reviewForm, setReviewForm] = useState({
    user_name: '',
    user_email: '',
    rating: 5,
    comment: ''
  });

  // Fetch variants on mount
  useEffect(() => {
    fetchVariants();
  }, [product.id]);

  const fetchVariants = async () => {
    if (!product.has_colors && !product.has_sizes) return;
    
    setLoadingVariants(true);
    try {
      // Always fetch colors if product has them (don't rely on product.colors)
      if (product.has_colors) {
        try {
          console.log('Fetching colors for product:', product.id);
          const colorsData = await apiFetch(`/api/products/${product.id}/colors`);
          console.log('Colors fetched:', colorsData);
          setColors(colorsData || []);
          // Set default selected color
          const defaultColor = colorsData?.find((c: ProductColor) => c.is_active);
          if (defaultColor) setSelectedColor(defaultColor);
        } catch (error) {
          console.error('Error fetching colors:', error);
          // Fallback to product.colors if available
          if (product.colors && product.colors.length > 0) {
            setColors(product.colors);
            const defaultColor = product.colors.find(c => c.is_active);
            if (defaultColor) setSelectedColor(defaultColor);
          }
        }
      }

      // Always fetch sizes if product has them
      if (product.has_sizes) {
        try {
          console.log('Fetching sizes for product:', product.id);
          const sizesData = await apiFetch(`/api/products/${product.id}/sizes`);
          console.log('Sizes fetched:', sizesData);
          setSizes(sizesData || []);
          // Set default selected size
          const defaultSize = sizesData?.find((s: ProductSize) => s.is_active);
          if (defaultSize) setSelectedSize(defaultSize);
        } catch (error) {
          console.error('Error fetching sizes:', error);
          // Fallback to product.sizes if available
          if (product.sizes && product.sizes.length > 0) {
            setSizes(product.sizes);
            const defaultSize = product.sizes.find(s => s.is_active);
            if (defaultSize) setSelectedSize(defaultSize);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
    } finally {
      setLoadingVariants(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/reviews/product/${product.id}`);
      const approvedReviews = data.filter((r: Review) => r.is_approved);
      setReviews(approvedReviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reviewForm.user_name.trim() || !reviewForm.comment.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          user_name: reviewForm.user_name,
          user_email: reviewForm.user_email || undefined,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        }),
      });

      toast.success('Review submitted! Pending approval.');
      setShowReviewForm(false);
      setReviewForm({
        user_name: '',
        user_email: '',
        rating: 5,
        comment: ''
      });
      
      await fetchReviews();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentImages = () => {
    // If a color is explicitly selected, use its images
    if (selectedColor && selectedColor.image_url) {
      const images = [selectedColor.image_url];
      if (selectedColor.additional_images && selectedColor.additional_images.length > 0) {
        return [...images, ...selectedColor.additional_images];
      }
      return images;
    }
    // If product has colors but none selected yet, use first active color's images
    if (product.has_colors && colors.length > 0) {
      const firstColor = colors.find(c => c.is_active !== false);
      if (firstColor?.image_url) {
        const images = [firstColor.image_url];
        if (firstColor.additional_images && firstColor.additional_images.length > 0) {
          return [...images, ...firstColor.additional_images];
        }
        return images;
      }
    }
    return product.additional_images && product.additional_images.length > 0
      ? [product.image_url, ...product.additional_images]
      : [product.image_url];
  };

  const productImages = getCurrentImages();

  const getCurrentStock = () => {
    if (selectedColor && selectedSize) {
      return Math.min(selectedColor.stock_quantity, selectedSize.stock_quantity);
    } else if (selectedColor) {
      return selectedColor.stock_quantity;
    } else if (selectedSize) {
      return selectedSize.stock_quantity;
    }
    return product.stock_quantity;
  };

  const getCurrentPrice = () => {
    let price = parseFloat(String(product.price)) || 0;
    if (selectedColor) {
      price += parseFloat(String(selectedColor.price_modifier)) || 0;
    }
    if (selectedSize) {
      price += parseFloat(String(selectedSize.price_modifier)) || 0;
    }
    return price;
  };

  const getCurrentImage = () => {
    if (selectedColor && selectedColor.image_url) {
      return selectedColor.image_url;
    }
    // Fall back to first active color image
    if (product.has_colors && colors.length > 0) {
      const firstColor = colors.find(c => c.is_active !== false);
      if (firstColor?.image_url) return firstColor.image_url;
    }
    return product.image_url;
  };

  const getProductName = () => {
    let name = product.name;
    const parts = [];
    if (selectedColor) {
      parts.push(selectedColor.color_name);
    }
    if (selectedSize) {
      parts.push(selectedSize.size_name);
    }
    if (parts.length > 0) {
      name += ` (${parts.join(', ')})`;
    }
    return name;
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const finalPrice = getCurrentPrice();
    const productImage = getCurrentImage();
    const productName = getProductName();
    const currentStock = getCurrentStock();
    
    if (currentStock < quantity) {
      toast.error(`Only ${currentStock} items available`);
      return;
    }
    
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: `${product.id}-${selectedColor?.id || ''}-${selectedSize?.id || ''}-${Date.now()}-${i}`,
        name: productName,
        price: finalPrice,
        quantity: 1,
        image_url: productImage,
        type: 'product',
        category: product.category,
        color_id: selectedColor?.id,
        color_name: selectedColor?.color_name,
        color_code: selectedColor?.color_code,
        size_id: selectedSize?.id,
        size_name: selectedSize?.size_name,
        size_code: selectedSize?.size_code
      });
    }
    toast.success(`${quantity} item${quantity > 1 ? 's' : ''} added to cart!`);
    onClose();
  };

  const handleCustomizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCustomize) {
      onCustomize();
    } else {
      setShowCustomization(true);
    }
  };

  const handleCustomizationClose = () => {
    setShowCustomization(false);
    onClose();
  };

  const handleHelpfulClick = (e: React.MouseEvent, reviewId: string) => {
    e.stopPropagation();
    if (helpfulReviews.includes(reviewId)) {
      setHelpfulReviews(helpfulReviews.filter(id => id !== reviewId));
    } else {
      setHelpfulReviews([...helpfulReviews, reviewId]);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  const getSortedReviews = () => {
    switch (reviewSort) {
      case 'newest':
        return [...reviews].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'highest':
        return [...reviews].sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return [...reviews].sort((a, b) => a.rating - b.rating);
      default:
        return reviews;
    }
  };

  const activeColors = colors.filter(c => c.is_active);
  const activeSizes = sizes.filter(s => s.is_active);
  const currentStock = getCurrentStock();

  return (
    <>
      <AnimatePresence mode="wait">
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-7xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Share + Close buttons */}
            <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = `${window.location.origin}/products?id=${product.id}`;
                  if (navigator.share) {
                    navigator.share({ title: product.name, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).then(() => toast.success('Product link copied!')).catch(() => {});
                  }
                }}
                className="p-2 sm:p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300"
                title="Share product"
              >
                <Share2 className="h-4 w-4 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 sm:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <div className="h-full">
              <div className="grid lg:grid-cols-2">
                <div className="bg-gradient-to-br from-gray-50 to-white p-4 sm:p-8">
                  <div className="space-y-4">
                    <div className="relative aspect-square rounded-xl sm:rounded-3xl overflow-hidden bg-white shadow-lg group">
                      <img
                        src={getImageUrl(productImages[selectedImage])}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {productImages.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
                          >
                            <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
                          >
                            <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
                          </button>
                        </>
                      )}
                      
                      {product.discount_percentage && (
                        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-gradient-to-r from-premium-burgundy to-red-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-sm sm:text-lg font-bold shadow-lg">
                          -{product.discount_percentage}% OFF
                        </div>
                      )}

                      {product.is_customizable && (
                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-1 sm:gap-2">
                          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Personalizable</span>
                          <span className="sm:hidden">Custom</span>
                        </div>
                      )}
                    </div>

                    {productImages.length > 1 && (
                      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
                        {productImages.map((url, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(idx);
                            }}
                            className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                              selectedImage === idx 
                                ? 'border-premium-gold shadow-lg' 
                                : 'border-transparent hover:border-premium-gold/50'
                            }`}
                          >
                            <img src={getImageUrl(url)} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-8">
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <h2 className="text-2xl sm:text-4xl font-serif font-bold text-premium-charcoal mb-2 sm:mb-3">
                        {product.name}
                      </h2>
                      
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                                  star <= Math.round(averageRating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            {averageRating > 0 ? averageRating.toFixed(1) : '0.0'} ({reviews.length})
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                          <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                          {product.category}
                        </span>
                      </div>
                    </div>

                    {/* Loading Variants */}
                    {loadingVariants && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-premium-gold mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Loading available options...</p>
                      </div>
                    )}

                    {/* Color Selection */}
                    {!loadingVariants && product.has_colors && activeColors.length > 0 && (
                      <div className="border-t border-b py-4">
                        <h3 className="text-sm font-medium mb-3">Available Colors</h3>
                        <div className="flex flex-wrap gap-3">
                          {activeColors.map((color) => {
                            const isSelected = selectedColor?.id === color.id;
                            
                            return (
                              <button
                                key={color.id}
                                onClick={() => {
                                  setSelectedColor(color);
                                  setSelectedImage(0);
                                }}
                                className={`relative p-3 border-2 rounded-lg transition-all min-w-[100px] ${
                                  isSelected 
                                    ? 'border-premium-gold bg-premium-gold/5' 
                                    : 'border-gray-200 hover:border-premium-gold'
                                }`}
                              >
                                <div className="flex flex-col items-center">
                                  <div 
                                    className="w-8 h-8 rounded-full mb-2 border-2 border-gray-200"
                                    style={{ backgroundColor: color.color_code || '#ccc' }}
                                  />
                                  <span className="text-xs font-medium">{color.color_name}</span>
                                  {color.price_modifier !== 0 && (
                                    <span className="text-[10px] text-premium-gold">
                                      {color.price_modifier > 0 ? '+' : ''}{formatCurrency(color.price_modifier)}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-premium-gold rounded-full flex items-center justify-center">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Size Selection */}
                    {!loadingVariants && product.has_sizes && activeSizes.length > 0 && (
                      <div className="border-t border-b py-4">
                        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          Available Sizes
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {activeSizes.map((size) => {
                            const isSelected = selectedSize?.id === size.id;
                            
                            return (
                              <button
                                key={size.id}
                                onClick={() => setSelectedSize(size)}
                                className={`relative px-4 py-2 border-2 rounded-lg transition-all min-w-[60px] text-center ${
                                  isSelected 
                                    ? 'border-premium-gold bg-premium-gold/5' 
                                    : 'border-gray-200 hover:border-premium-gold'
                                }`}
                              >
                                <span className="text-sm font-medium">{size.size_name}</span>
                                {size.size_code && (
                                  <span className="text-xs text-gray-500 block">{size.size_code}</span>
                                )}
                                {size.price_modifier !== 0 && (
                                  <span className="text-[10px] text-premium-gold">
                                    {size.price_modifier > 0 ? '+' : ''}{formatCurrency(size.price_modifier)}
                                  </span>
                                )}
                                {isSelected && (
                                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-premium-gold rounded-full flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Show message if no sizes available */}
                    {!loadingVariants && product.has_sizes && activeSizes.length === 0 && (
                      <div className="border-t border-b py-4 text-center text-gray-500">
                        <p className="text-sm">No sizes available at the moment</p>
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-premium-cream to-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-premium-gold/10">
                      <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
                        <p className="text-3xl sm:text-5xl font-bold text-premium-gold">
                          {formatCurrency(getCurrentPrice())}
                        </p>
                        {product.original_price && (
                          <>
                            <p className="text-lg sm:text-2xl text-gray-400 line-through">
                              {formatCurrency(product.original_price)}
                            </p>
                            <p className="text-xs sm:text-sm bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full font-medium">
                              Save {formatCurrency(product.original_price - getCurrentPrice())}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full w-fit ${
                        currentStock > 10 
                          ? 'bg-green-50 text-green-700' 
                          : currentStock > 0 
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          currentStock > 10 ? 'bg-green-500 animate-pulse' :
                          currentStock > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                        }`} />
                        <span className="text-xs sm:text-sm font-medium">
                          {currentStock > 10 ? 'In Stock' :
                           currentStock > 0 ? `Only ${currentStock} left` : 'Out of Stock'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">Qty:</span>
                        <div className="flex items-center border-2 border-premium-gold/20 rounded-xl overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuantity(Math.max(1, quantity - 1));
                            }}
                            className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-premium-gold/10 transition-colors text-base sm:text-lg font-medium"
                          >
                            −
                          </button>
                          <span className="px-3 sm:px-4 py-1 sm:py-2 border-x-2 border-premium-gold/20 font-medium min-w-[40px] sm:min-w-[50px] text-center text-sm sm:text-base">
                            {quantity}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuantity(Math.min(currentStock, quantity + 1));
                            }}
                            className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-premium-gold/10 transition-colors text-base sm:text-lg font-medium"
                            disabled={quantity >= currentStock}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-premium-gold/10 overflow-x-auto">
                      <div className="flex gap-4 sm:gap-6">
                        {['details', 'reviews'].map((tab) => (
                          <button
                            key={tab}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab(tab as any);
                            }}
                            className={`pb-2 sm:pb-3 px-1 font-medium capitalize transition-all relative text-sm sm:text-base whitespace-nowrap ${
                              activeTab === tab
                                ? 'text-premium-gold'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {tab}
                            {tab === 'reviews' && reviews.length > 0 && (
                              <span className="absolute -top-1 -right-2 w-4 h-4 sm:w-5 sm:h-5 bg-premium-gold text-white text-xs rounded-full flex items-center justify-center">
                                {reviews.length}
                              </span>
                            )}
                            {activeTab === tab && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-premium-gold to-premium-burgundy"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="min-h-[300px]">
                      {activeTab === 'details' && (
                        <div>
                          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                            {product.description}
                          </p>
                          
                          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                              <p className="text-xs text-gray-500 mb-1">SKU</p>
                              <p className="font-mono text-xs sm:text-sm font-medium">
                                {product.sku}
                                {selectedColor && `-${selectedColor.color_name}`}
                                {selectedSize && `-${selectedSize.size_name}`}
                              </p>
                            </div>
                            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                              <p className="text-xs text-gray-500 mb-1">Category</p>
                              <p className="text-xs sm:text-sm font-medium">{product.category}</p>
                            </div>
                            {product.gender && (
                              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">Gender</p>
                                <p className="text-xs sm:text-sm font-medium capitalize">{product.gender}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === 'reviews' && (
                        <div className="space-y-4 sm:space-y-6">
                          {/* Review Header with Sort and Add Review Button */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                                <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
                                <span className="text-gray-500 text-sm">/5</span>
                              </div>
                              <span className="text-gray-500 text-sm">({reviews.length} reviews)</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <select
                                value={reviewSort}
                                onChange={(e) => setReviewSort(e.target.value as any)}
                                className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                              >
                                <option value="newest">Newest First</option>
                                <option value="highest">Highest Rated</option>
                                <option value="lowest">Lowest Rated</option>
                              </select>
                              
                              <button
                                onClick={() => setShowReviewForm(!showReviewForm)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors text-sm"
                              >
                                <MessageCircle className="h-4 w-4" />
                                Write Review
                              </button>
                            </div>
                          </div>

                          {/* Rating Distribution */}
                          {reviews.length > 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="text-sm font-medium mb-3">Rating Distribution</h4>
                              <div className="space-y-2">
                                {ratingDistribution.map(({ rating, count, percentage }) => (
                                  <div key={rating} className="flex items-center gap-2">
                                    <span className="text-xs w-8">{rating} ★</span>
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-yellow-400 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-500 w-12">{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Review Form */}
                          {showReviewForm && (
                            <div ref={reviewFormRef} className="bg-white border rounded-lg p-4 shadow-sm">
                              <h4 className="font-medium mb-3">Write a Review</h4>
                              <form onSubmit={handleSubmitReview} className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Your Name *</label>
                                  <input
                                    type="text"
                                    value={reviewForm.user_name}
                                    onChange={(e) => setReviewForm({...reviewForm, user_name: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-premium-gold"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Email (optional)</label>
                                  <input
                                    type="email"
                                    value={reviewForm.user_email}
                                    onChange={(e) => setReviewForm({...reviewForm, user_email: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-premium-gold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Rating *</label>
                                  <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setReviewForm({...reviewForm, rating: star})}
                                        className="focus:outline-none"
                                      >
                                        <Star 
                                          className={`h-6 w-6 ${
                                            star <= reviewForm.rating 
                                              ? 'text-yellow-400 fill-current' 
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Your Review *</label>
                                  <textarea
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                                    rows={4}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-premium-gold"
                                    required
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors disabled:opacity-50"
                                  >
                                    {submitting ? 'Submitting...' : 'Submit Review'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowReviewForm(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}

                          {/* Reviews List */}
                          {loading ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-gold mx-auto"></div>
                            </div>
                          ) : reviews.length === 0 ? (
                            <div className="text-center py-8">
                              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                            </div>
                          ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                              {getSortedReviews().map((review) => (
                                <div key={review.id} className="border-b pb-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="flex">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                              key={star}
                                              className={`h-4 w-4 ${
                                                star <= review.rating
                                                  ? 'text-yellow-400 fill-current'
                                                  : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-sm font-medium">{review.user_name}</span>
                                      </div>
                                      <span className="text-xs text-gray-400">
                                        {new Date(review.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => handleHelpfulClick(e, review.id)}
                                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                                        helpfulReviews.includes(review.id)
                                          ? 'bg-green-50 text-green-600'
                                          : 'hover:bg-gray-100'
                                      }`}
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                      <span>Helpful</span>
                                    </button>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 sm:pt-6 border-t border-premium-gold/10">
                      {product.is_customizable ? (
                        <button
                          onClick={handleCustomizeClick}
                          className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
                        >
                          <PenTool className="h-4 w-4 sm:h-5 sm:w-5" />
                          Customize This Product
                        </button>
                      ) : (
                        <button
                          onClick={handleAddToCart}
                          disabled={currentStock === 0}
                          className="w-full py-3 sm:py-4 bg-gradient-to-r from-premium-gold to-premium-burgundy text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
                        >
                          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                          Add to Cart • {formatCurrency(getCurrentPrice() * quantity)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showCustomization && (
          <ProductCustomizationModal
            product={product}
            selectedImageUrl={getCurrentImage()}
            onClose={handleCustomizationClose}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductDetailsModal;