import React, { useState, useEffect } from 'react';
import { 
  X, ShoppingCart, Star, ChevronLeft, ChevronRight, 
  ThumbsUp, MessageCircle, Send, PenTool, Shield,
  Truck, RotateCcw, Heart, Share2, Check, Award,
  Clock, Package, Sparkles, Filter, SortAsc, SortDesc
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
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [helpfulReviews, setHelpfulReviews] = useState<string[]>([]);

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

      toast.success(
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" />
          <span>Review submitted! Pending approval.</span>
        </div>
      );
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

  const handleAddToCart = () => {
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
    toast.success(
      <div className="flex items-center gap-2">
        <Check className="h-5 w-5 text-green-500" />
        <span>{quantity} item{quantity > 1 ? 's' : ''} added to cart!</span>
      </div>
    );
    onClose();
  };

  const handleCustomizeClick = () => {
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

  const handleHelpfulClick = (reviewId: string) => {
    if (helpfulReviews.includes(reviewId)) {
      setHelpfulReviews(helpfulReviews.filter(id => id !== reviewId));
    } else {
      setHelpfulReviews([...helpfulReviews, reviewId]);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = () => {
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
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-3xl w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Premium Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-premium-gold via-premium-burgundy to-premium-gold" />

            {/* Close Button - Premium Styling */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-20 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300 group"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid lg:grid-cols-2 h-full">
              {/* Left Column - Images with Premium Gallery */}
              <div className="relative h-full bg-gradient-to-br from-gray-50 to-white p-8">
                <div className="sticky top-0 space-y-4">
                  {/* Main Image with Premium Frame */}
                  <div className="relative aspect-square rounded-3xl overflow-hidden bg-white shadow-xl group">
                    <motion.img
                      key={selectedImage}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      src={getImageUrl(productImages[selectedImage])}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Image Navigation with Premium Styling */}
                    {productImages.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </>
                    )}
                    
                    {/* Discount Badge - Premium */}
                    {product.discount_percentage && (
                      <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-4 left-4 bg-gradient-to-r from-premium-burgundy to-red-600 text-white px-4 py-2 rounded-full text-lg font-bold shadow-lg"
                      >
                        -{product.discount_percentage}% OFF
                      </motion.div>
                    )}

                    {/* Customizable Badge */}
                    {product.is_customizable && (
                      <motion.div
                        initial={{ x: 100 }}
                        animate={{ x: 0 }}
                        className="absolute top-4 right-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Personalizable</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Thumbnail Gallery - Premium */}
                  {productImages.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-premium-gold/20">
                      {productImages.map((url, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedImage(idx)}
                          className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                            selectedImage === idx 
                              ? 'border-premium-gold shadow-lg' 
                              : 'border-transparent hover:border-premium-gold/50'
                          }`}
                        >
                          <img src={getImageUrl(url)} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Details with Premium Typography */}
              <div className="overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-premium-gold/20">
                <div className="p-8 space-y-8">
                  {/* Title Section */}
                  <div>
                    <h2 className="text-4xl font-serif font-bold text-premium-charcoal mb-3">
                      {product.name}
                    </h2>
                    
                    {/* Rating with Premium Design */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${
                                star <= Math.round(averageRating)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {averageRating.toFixed(1)} ({reviews.length} reviews)
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {product.category}
                      </span>
                    </div>
                  </div>

                  {/* Price Section - Premium */}
                  <div className="bg-gradient-to-r from-premium-cream to-white p-6 rounded-2xl border border-premium-gold/10">
                    <div className="flex items-baseline gap-4">
                      <p className="text-5xl font-bold text-premium-gold">
                        {formatCurrency(product.price)}
                      </p>
                      {product.original_price && (
                        <>
                          <p className="text-2xl text-gray-400 line-through">
                            {formatCurrency(product.original_price)}
                          </p>
                          <p className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                            Save {formatCurrency(product.original_price - product.price)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stock Status & Quantity */}
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
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
                      <span className="text-sm font-medium">
                        {product.stock_quantity > 10 ? 'In Stock' :
                         product.stock_quantity > 0 ? `Only ${product.stock_quantity} left` : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700">Qty:</span>
                      <div className="flex items-center border-2 border-premium-gold/20 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="px-3 py-1 hover:bg-premium-gold/10 transition-colors text-lg font-medium"
                        >
                          −
                        </button>
                        <span className="px-4 py-1 border-x-2 border-premium-gold/20 font-medium min-w-[50px] text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                          className="px-3 py-1 hover:bg-premium-gold/10 transition-colors text-lg font-medium"
                          disabled={quantity >= product.stock_quantity}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tabs with Premium Design */}
                  <div className="border-b border-premium-gold/10">
                    <div className="flex gap-6">
                      {['details', 'reviews', 'shipping'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab as any)}
                          className={`pb-3 px-1 font-medium capitalize transition-all relative ${
                            activeTab === tab
                              ? 'text-premium-gold'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab}
                          {tab === 'reviews' && reviews.length > 0 && (
                            <span className="absolute -top-1 -right-2 w-5 h-5 bg-premium-gold text-white text-xs rounded-full flex items-center justify-center">
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

                  {/* Tab Content with Premium Styling */}
                  <div className="min-h-[300px]">
                    {activeTab === 'details' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="prose max-w-none"
                      >
                        <p className="text-gray-700 leading-relaxed text-lg">
                          {product.description}
                        </p>
                        
                        {/* Product Specifications */}
                        <div className="mt-8 grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">SKU</p>
                            <p className="font-mono font-medium">{product.sku}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Category</p>
                            <p className="font-medium">{product.category}</p>
                          </div>
                          {product.gender && (
                            <div className="p-4 bg-gray-50 rounded-xl">
                              <p className="text-xs text-gray-500 mb-1">Gender</p>
                              <p className="font-medium capitalize">{product.gender}</p>
                            </div>
                          )}
                          {product.subcategory && (
                            <div className="p-4 bg-gray-50 rounded-xl">
                              <p className="text-xs text-gray-500 mb-1">Subcategory</p>
                              <p className="font-medium">{product.subcategory}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'reviews' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* Review Summary */}
                        {reviews.length > 0 && (
                          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-premium-gold/10">
                            <div className="flex items-center gap-8">
                              <div className="text-center">
                                <p className="text-5xl font-bold text-premium-gold">
                                  {averageRating.toFixed(1)}
                                </p>
                                <div className="flex mt-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= Math.round(averageRating)
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                                </p>
                              </div>
                              <div className="flex-1 space-y-2">
                                {ratingDistribution.map(({ rating, count, percentage }) => (
                                  <div key={rating} className="flex items-center gap-2">
                                    <span className="text-sm w-8">{rating} ★</span>
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.5, delay: rating * 0.1 }}
                                        className="h-full bg-gradient-to-r from-premium-gold to-premium-burgundy"
                                      />
                                    </div>
                                    <span className="text-sm text-gray-600 w-8">{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Write Review Button */}
                        {!showReviewForm && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowReviewForm(true)}
                            className="w-full py-4 bg-gradient-to-r from-premium-gold/10 to-premium-cream text-premium-gold rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2 border-2 border-premium-gold/20"
                          >
                            <MessageCircle className="h-5 w-5" />
                            Share Your Experience
                          </motion.button>
                        )}

                        {/* Review Form */}
                        {showReviewForm && (
                          <motion.form
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleSubmitReview}
                            className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 space-y-4 border border-premium-gold/10"
                          >
                            <h3 className="font-semibold text-xl">Write a Review</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Your Name *</label>
                                <input
                                  type="text"
                                  value={reviewForm.user_name}
                                  onChange={(e) => setReviewForm({...reviewForm, user_name: e.target.value})}
                                  className="w-full px-4 py-3 border border-premium-gold/20 rounded-xl focus:border-premium-gold focus:outline-none transition-all"
                                  placeholder="John Doe"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Email (Optional)</label>
                                <input
                                  type="email"
                                  value={reviewForm.user_email}
                                  onChange={(e) => setReviewForm({...reviewForm, user_email: e.target.value})}
                                  className="w-full px-4 py-3 border border-premium-gold/20 rounded-xl focus:border-premium-gold focus:outline-none transition-all"
                                  placeholder="john@example.com"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Rating *</label>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewForm({...reviewForm, rating: star})}
                                    className="focus:outline-none group"
                                  >
                                    <Star
                                      className={`h-8 w-8 transition-all ${
                                        star <= reviewForm.rating
                                          ? 'text-yellow-400 fill-current scale-110'
                                          : 'text-gray-300 group-hover:text-yellow-200'
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
                                className="w-full px-4 py-3 border border-premium-gold/20 rounded-xl focus:border-premium-gold focus:outline-none transition-all"
                                placeholder="Tell us about your experience with this product..."
                                required
                              />
                            </div>

                            <div className="flex gap-3">
                              <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 py-3 bg-gradient-to-r from-premium-gold to-premium-burgundy text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {submitting ? (
                                  <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Submitting...
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-5 w-5" />
                                    Submit Review
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowReviewForm(false)}
                                className="px-6 py-3 border-2 border-premium-gold/20 rounded-xl hover:bg-gray-50 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.form>
                        )}

                        {/* Reviews List Header */}
                        {reviews.length > 0 && (
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Customer Reviews</h3>
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4 text-gray-400" />
                              <select
                                value={reviewSort}
                                onChange={(e) => setReviewSort(e.target.value as any)}
                                className="text-sm border-0 bg-transparent focus:outline-none text-gray-600"
                              >
                                <option value="newest">Newest First</option>
                                <option value="highest">Highest Rated</option>
                                <option value="lowest">Lowest Rated</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Reviews List */}
                        {loading ? (
                          <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-gold mx-auto"></div>
                          </div>
                        ) : reviews.length === 0 && !showReviewForm ? (
                          <div className="text-center py-12">
                            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No reviews yet</p>
                            <p className="text-sm text-gray-400">Be the first to share your experience</p>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {getSortedReviews().map((review) => (
                              <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-premium-gold/10 hover:shadow-md transition-all"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-premium-gold to-premium-burgundy flex items-center justify-center text-white font-bold">
                                        {review.user_name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-semibold">{review.user_name}</p>
                                        <div className="flex items-center gap-2">
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
                                          <span className="text-xs text-gray-400">
                                            {new Date(review.created_at).toLocaleDateString('en-IN', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric'
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleHelpfulClick(review.id)}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${
                                      helpfulReviews.includes(review.id)
                                        ? 'bg-premium-gold/20 text-premium-gold'
                                        : 'hover:bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    <ThumbsUp className={`h-4 w-4 ${
                                      helpfulReviews.includes(review.id) ? 'fill-current' : ''
                                    }`} />
                                    <span>Helpful</span>
                                  </button>
                                </div>
                                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                                
                                {/* Verified Purchase Badge */}
                                <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                                  <Check className="h-3 w-3" />
                                  <span>Verified Purchase</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'shipping' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-premium-gold/10">
                          <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-premium-gold" />
                            Shipping Information
                          </h4>
                          <div className="space-y-3 text-gray-600">
                            <p className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              Free shipping on orders above ₹499
                            </p>
                            <p className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              Standard delivery: 3-5 business days
                            </p>
                            <p className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              Express shipping: 1-2 business days (₹150)
                            </p>
                            <p className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              Same day delivery available in select cities
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Action Buttons - Premium Design */}
                  <div className="pt-6 border-t border-premium-gold/10">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Add to Cart Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddToCart}
                        disabled={product.stock_quantity === 0}
                        className="py-4 bg-gradient-to-r from-premium-gold to-premium-burgundy text-white rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg font-medium group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                        <ShoppingCart className="h-5 w-5" />
                        Add to Cart • {formatCurrency(product.price * quantity)}
                      </motion.button>

                      {/* Customize Button - Only for customizable products */}
                      {product.is_customizable && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleCustomizeClick}
                          className="py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg font-medium group relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                          <PenTool className="h-5 w-5" />
                          Personalize
                        </motion.button>
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
      {showCustomization && (
        <ProductCustomizationModal
          product={product}
          onClose={handleCustomizationClose}
        />
      )}
    </>
  );
};

export default ProductDetailsModal;