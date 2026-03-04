import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ShoppingCart, Star, ChevronLeft, ChevronRight, 
  ThumbsUp, MessageCircle, Send, PenTool, Truck,
  Package, Sparkles, Filter, Check
} from 'lucide-react';
import { Product, Review } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../config';
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
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'shipping'>('details');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [helpfulReviews, setHelpfulReviews] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    user_name: '',
    user_email: '',
    rating: 5,
    comment: ''
  });

  // Get additional images if available
  const productImages = product.additional_images && product.additional_images.length > 0
    ? [product.image_url, ...product.additional_images]
    : [product.image_url];

  useEffect(() => {
    fetchReviews();
    
    // Handle escape key
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

  // Handle click outside
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
      setReviews(data || []);
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    for (let i = 0; i < quantity; i++) {
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

  // Sort reviews based on selected sort option
  const getSortedReviews = () => {
    const approvedReviews = reviews.filter(r => r.is_approved);
    
    switch (reviewSort) {
      case 'newest':
        return [...approvedReviews].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'highest':
        return [...approvedReviews].sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return [...approvedReviews].sort((a, b) => a.rating - b.rating);
      default:
        return approvedReviews;
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-7xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-3 right-3 sm:top-6 sm:right-6 z-50 p-2 sm:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Scrollable Container */}
            <div className="h-full">
              <div className="grid lg:grid-cols-2">
                {/* Left Column - Images */}
                <div className="bg-gradient-to-br from-gray-50 to-white p-4 sm:p-8">
                  <div className="space-y-4">
                    {/* Main Image */}
                    <div className="relative aspect-square rounded-xl sm:rounded-3xl overflow-hidden bg-white shadow-lg group">
                      <img
                        src={getImageUrl(productImages[selectedImage])}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Image Navigation */}
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
                      
                      {/* Discount Badge */}
                      {product.discount_percentage && (
                        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-gradient-to-r from-premium-burgundy to-red-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-sm sm:text-lg font-bold shadow-lg">
                          -{product.discount_percentage}% OFF
                        </div>
                      )}

                      {/* Customizable Badge */}
                      {product.is_customizable && (
                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-1 sm:gap-2">
                          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Personalizable</span>
                          <span className="sm:hidden">Custom</span>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Gallery */}
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

                {/* Right Column - Details */}
                <div className="p-4 sm:p-8">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Title Section */}
                    <div>
                      <h2 className="text-2xl sm:text-4xl font-serif font-bold text-premium-charcoal mb-2 sm:mb-3">
                        {product.name}
                      </h2>
                      
                      {/* Rating */}
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
                            {averageRating.toFixed(1)} ({reviews.length})
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                          <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                          {product.category}
                        </span>
                      </div>
                    </div>

                    {/* Price Section */}
                    <div className="bg-gradient-to-r from-premium-cream to-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-premium-gold/10">
                      <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
                        <p className="text-3xl sm:text-5xl font-bold text-premium-gold">
                          {formatCurrency(product.price)}
                        </p>
                        {product.original_price && (
                          <>
                            <p className="text-lg sm:text-2xl text-gray-400 line-through">
                              {formatCurrency(product.original_price)}
                            </p>
                            <p className="text-xs sm:text-sm bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full font-medium">
                              Save {formatCurrency(product.original_price - product.price)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stock Status & Quantity */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full w-fit ${
                        product.stock_quantity > 10 
                          ? 'bg-green-50 text-green-700' 
                          : product.stock_quantity > 0 
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          product.stock_quantity > 10 ? 'bg-green-500 animate-pulse' :
                          product.stock_quantity > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                        }`} />
                        <span className="text-xs sm:text-sm font-medium">
                          {product.stock_quantity > 10 ? 'In Stock' :
                           product.stock_quantity > 0 ? `Only ${product.stock_quantity} left` : 'Out of Stock'}
                        </span>
                      </div>

                      {/* Quantity Selector */}
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
                              setQuantity(Math.min(product.stock_quantity, quantity + 1));
                            }}
                            className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-premium-gold/10 transition-colors text-base sm:text-lg font-medium"
                            disabled={quantity >= product.stock_quantity}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-premium-gold/10 overflow-x-auto">
                      <div className="flex gap-4 sm:gap-6">
                        {['details', 'reviews', 'shipping'].map((tab) => (
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

                    {/* Tab Content */}
                    <div className="min-h-[250px]">
                      {activeTab === 'details' && (
                        <div>
                          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                            {product.description}
                          </p>
                          
                          {/* Product Specifications */}
                          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                              <p className="text-xs text-gray-500 mb-1">SKU</p>
                              <p className="font-mono text-xs sm:text-sm font-medium">{product.sku}</p>
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
                          {/* Review Summary */}
                          {reviews.length > 0 && (
                            <div className="bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-premium-gold/10">
                              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                                <div className="text-center">
                                  <p className="text-3xl sm:text-5xl font-bold text-premium-gold">
                                    {averageRating.toFixed(1)}
                                  </p>
                                  <div className="flex mt-1 sm:mt-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 sm:h-4 sm:w-4 ${
                                          star <= Math.round(averageRating)
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {reviews.length} reviews
                                  </p>
                                </div>
                                <div className="flex-1 w-full space-y-2">
                                  {ratingDistribution.map(({ rating, count, percentage }) => (
                                    <div key={rating} className="flex items-center gap-2">
                                      <span className="text-xs sm:text-sm w-6 sm:w-8">{rating} ★</span>
                                      <div className="flex-1 h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-premium-gold to-premium-burgundy"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-xs sm:text-sm text-gray-600 w-6 sm:w-8">{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Write Review Button */}
                          {!showReviewForm && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowReviewForm(true);
                              }}
                              className="w-full py-3 sm:py-4 bg-gradient-to-r from-premium-gold/10 to-premium-cream text-premium-gold rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2 border-2 border-premium-gold/20 text-sm sm:text-base"
                            >
                              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                              Write a Review
                            </button>
                          )}

                          {/* Review Form */}
                          {showReviewForm && (
                            <form
                              onSubmit={handleSubmitReview}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border border-premium-gold/10"
                            >
                              <h3 className="font-semibold text-base sm:text-xl">Write a Review</h3>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                  <label className="block text-xs sm:text-sm font-medium mb-1">Name *</label>
                                  <input
                                    type="text"
                                    value={reviewForm.user_name}
                                    onChange={(e) => setReviewForm({...reviewForm, user_name: e.target.value})}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-premium-gold/20 rounded-lg focus:border-premium-gold focus:outline-none"
                                    placeholder="John Doe"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm font-medium mb-1">Email</label>
                                  <input
                                    type="email"
                                    value={reviewForm.user_email}
                                    onChange={(e) => setReviewForm({...reviewForm, user_email: e.target.value})}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-premium-gold/20 rounded-lg focus:border-premium-gold focus:outline-none"
                                    placeholder="john@example.com"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs sm:text-sm font-medium mb-1">Rating *</label>
                                <div className="flex gap-1 sm:gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReviewForm({...reviewForm, rating: star});
                                      }}
                                    >
                                      <Star
                                        className={`h-6 w-6 sm:h-8 sm:w-8 ${
                                          star <= reviewForm.rating
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300 hover:text-yellow-200'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs sm:text-sm font-medium mb-1">Review *</label>
                                <textarea
                                  value={reviewForm.comment}
                                  onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                                  rows={3}
                                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-premium-gold/20 rounded-lg focus:border-premium-gold focus:outline-none"
                                  placeholder="Tell us about your experience..."
                                  required
                                />
                              </div>

                              <div className="flex gap-2 sm:gap-3">
                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="flex-1 py-2 sm:py-3 bg-gradient-to-r from-premium-gold to-premium-burgundy text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                  {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowReviewForm(false);
                                  }}
                                  className="px-4 sm:px-6 py-2 sm:py-3 border-2 border-premium-gold/20 rounded-lg text-sm hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Reviews List */}
                          {loading ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-gold mx-auto"></div>
                            </div>
                          ) : reviews.length === 0 && !showReviewForm ? (
                            <div className="text-center py-8">
                              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No reviews yet</p>
                            </div>
                          ) : (
                            <div className="space-y-3 sm:space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2">
                              {getSortedReviews().map((review) => (
                                <div
                                  key={review.id}
                                  className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-premium-gold/10"
                                >
                                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-premium-gold to-premium-burgundy flex items-center justify-center text-white font-bold text-sm sm:text-base">
                                        {review.user_name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-sm sm:text-base">{review.user_name}</p>
                                        <div className="flex items-center gap-1 sm:gap-2">
                                          <div className="flex">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                className={`h-3 w-3 sm:h-4 sm:w-4 ${
                                                  star <= review.rating
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-gray-300'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs text-gray-400">
                                            {new Date(review.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => handleHelpfulClick(e, review.id)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                                        helpfulReviews.includes(review.id)
                                          ? 'bg-premium-gold/20 text-premium-gold'
                                          : 'hover:bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      <ThumbsUp className={`h-3 w-3 ${
                                        helpfulReviews.includes(review.id) ? 'fill-current' : ''
                                      }`} />
                                      <span>Helpful</span>
                                    </button>
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-700">{review.comment}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'shipping' && (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl border border-premium-gold/10">
                            <h4 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-premium-gold" />
                              Shipping Information
                            </h4>
                            <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                              <p>✓ Free shipping on orders above ₹499</p>
                              <p>✓ Standard delivery: 3-5 business days</p>
                              <p>✓ Express shipping: 1-2 business days (+₹150)</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
<div className="pt-4 sm:pt-6 border-t border-premium-gold/10">
  {product.is_customizable ? (
    /* Only Customize Button when customizable */
    <button
      onClick={handleCustomizeClick}
      className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
    >
      <PenTool className="h-4 w-4 sm:h-5 sm:w-5" />
      Customize This Product
    </button>
  ) : (
    /* Only Add to Cart when not customizable */
    <button
      onClick={handleAddToCart}
      disabled={product.stock_quantity === 0}
      className="w-full py-3 sm:py-4 bg-gradient-to-r from-premium-gold to-premium-burgundy text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
    >
      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
      Add to Cart • {formatCurrency(product.price * quantity)}
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

      {/* Customization Modal */}
      <AnimatePresence mode="wait">
        {showCustomization && (
          <ProductCustomizationModal
            product={product}
            onClose={handleCustomizationClose}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductDetailsModal;