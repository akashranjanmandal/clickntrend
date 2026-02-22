import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Star, ChevronLeft, ChevronRight, ThumbsUp, MessageCircle, Send } from 'lucide-react';
import { Product, Review } from '../types';
import { formatCurrency, getImageUrl } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../config';
import toast from 'react-hot-toast';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose }) => {
  const { addItem } = useCart();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [showReviewForm, setShowReviewForm] = useState(false);

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

      toast.success('Review submitted successfully! It will be visible after admin approval.');
      setShowReviewForm(false);
      setReviewForm({
        user_name: '',
        user_email: '',
        rating: 5,
        comment: ''
      });
      
      // Refresh reviews to show the new one (though it will be pending)
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
    onClose();
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Left Column - Images */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={getImageUrl(productImages[selectedImage])}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                
                {productImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-colors"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-colors"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
                
                {product.discount_percentage && (
                  <div className="absolute top-4 left-4 bg-premium-burgundy text-white px-4 py-2 rounded-full text-lg font-bold">
                    -{product.discount_percentage}%
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {productImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {productImages.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedImage === idx ? 'border-premium-gold scale-105' : 'border-transparent hover:scale-105'
                      }`}
                    >
                      <img src={getImageUrl(url)} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Title & Rating */}
              <div>
                <h2 className="text-3xl font-serif font-bold text-premium-charcoal mb-2">
                  {product.name}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
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
                    <span className="ml-2 text-sm text-gray-600">
                      ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Category: {product.category}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-bold text-premium-gold">
                  {formatCurrency(product.price)}
                </p>
                {product.original_price && (
                  <>
                    <p className="text-xl text-gray-400 line-through">
                      {formatCurrency(product.original_price)}
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      Save {formatCurrency(product.original_price - product.price)}
                    </p>
                  </>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  product.stock_quantity > 10 ? 'bg-green-500' :
                  product.stock_quantity > 0 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {product.stock_quantity > 10 ? 'In Stock' :
                   product.stock_quantity > 0 ? `Only ${product.stock_quantity} left` : 'Out of Stock'}
                </span>
              </div>

              {/* Tabs */}
              <div className="border-b">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-2 px-1 font-medium transition-colors relative ${
                      activeTab === 'details'
                        ? 'text-premium-gold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Details
                    {activeTab === 'details' && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-premium-gold"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-2 px-1 font-medium transition-colors relative ${
                      activeTab === 'reviews'
                        ? 'text-premium-gold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Reviews ({reviews.length})
                    {activeTab === 'reviews' && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-premium-gold"
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-[300px]">
                {activeTab === 'details' ? (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {product.description}
                    </p>
                    
                    {/* Additional product details */}
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">SKU</p>
                        <p className="font-medium">GFT-{product.id.slice(0, 8)}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Category</p>
                        <p className="font-medium">{product.category}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Write Review Button */}
                    {!showReviewForm && (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="w-full py-3 bg-premium-gold/10 text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="h-5 w-5" />
                        Write a Review
                      </button>
                    )}

                    {/* Review Form */}
                    {showReviewForm && (
                      <motion.form
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleSubmitReview}
                        className="bg-gray-50 rounded-xl p-6 space-y-4"
                      >
                        <h3 className="font-semibold text-lg">Share Your Experience</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Your Name *</label>
                            <input
                              type="text"
                              value={reviewForm.user_name}
                              onChange={(e) => setReviewForm({...reviewForm, user_name: e.target.value})}
                              className="w-full px-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
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
                              className="w-full px-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
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
                                className="focus:outline-none"
                              >
                                <Star
                                  className={`h-8 w-8 ${
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
                          <label className="block text-sm font-medium mb-1">Your Review *</label>
                          <textarea
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
                            placeholder="Tell us about your experience with this product..."
                            required
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {submitting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                Submit Review
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowReviewForm(false)}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.form>
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
                        <p className="text-sm text-gray-400">Be the first to review this product</p>
                      </div>
                    ) : (
                      <>
                        {/* Review Summary */}
                        {reviews.length > 0 && (
                          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <p className="text-4xl font-bold text-premium-gold">
                                {averageRating.toFixed(1)}
                              </p>
                              <div className="flex mt-1">
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
                                    <div
                                      className="h-full bg-premium-gold"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600 w-8">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reviews List */}
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {reviews.map((review) => (
                            <div key={review.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium">{review.user_name}</p>
                                  <div className="flex items-center gap-2 mt-1">
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
                                    <span className="text-xs text-gray-500">
                                      {new Date(review.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <ThumbsUp className="h-4 w-4 text-gray-400 hover:text-premium-gold cursor-pointer" />
                              </div>
                              <p className="text-gray-700">{review.comment}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Add to Cart */}
              <div className="pt-6 border-t">
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-sm font-medium">Quantity:</label>
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 border-x">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors"
                      disabled={quantity >= product.stock_quantity}
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">
                    Max: {product.stock_quantity}
                  </span>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0}
                  className="w-full py-4 bg-premium-gold text-white rounded-xl hover:bg-premium-burgundy transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-medium"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart • {formatCurrency(product.price * quantity)}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProductDetailsModal;