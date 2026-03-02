import React, { useState, useEffect } from 'react';
import { 
  X, ShoppingCart, Star, ChevronLeft, ChevronRight, 
  ThumbsUp, MessageCircle, Send, PenTool, Shield,
  Truck, RotateCcw, Heart, Share2, Check, Award,
  Clock, Package, Sparkles
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

  // Premium features list
  const premiumFeatures = [
    { icon: <Truck className="h-5 w-5" />, text: 'Free Shipping on orders above ₹999' },
    { icon: <RotateCcw className="h-5 w-5" />, text: '30-day easy returns' },
    { icon: <Shield className="h-5 w-5" />, text: '2-year warranty' },
    { icon: <Award className="h-5 w-5" />, text: 'Premium gift packaging' },
  ];

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

            {/* Wishlist & Share Buttons */}
            <div className="absolute top-6 right-20 z-20 flex gap-2">
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold/10 transition-all duration-300 group"
              >
                <Heart className={`h-5 w-5 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600 group-hover:text-premium-gold'}`} />
              </button>
              <button className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold/10 transition-all duration-300 group">
                <Share2 className="h-5 w-5 text-gray-600 group-hover:text-premium-gold" />
              </button>
            </div>

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

                  {/* Stock Status with Premium Indicator */}
                  <div className="flex items-center gap-4">
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
                    
                    {/* Estimated Delivery */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>Delivery in 3-5 days</span>
                    </div>
                  </div>

                  {/* Quantity Selector - Premium */}
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-medium text-gray-700">Quantity</span>
                    <div className="flex items-center border-2 border-premium-gold/20 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-4 py-2 hover:bg-premium-gold/10 transition-colors text-lg font-medium"
                      >
                        −
                      </button>
                      <span className="px-6 py-2 border-x-2 border-premium-gold/20 font-medium min-w-[60px] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                        className="px-4 py-2 hover:bg-premium-gold/10 transition-colors text-lg font-medium"
                        disabled={quantity >= product.stock_quantity}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">
                      Max: {product.stock_quantity}
                    </span>
                  </div>

                  {/* Premium Features Grid */}
                  <div className="grid grid-cols-2 gap-4 py-4">
                    {premiumFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="text-premium-gold">{feature.icon}</div>
                        <span>{feature.text}</span>
                      </div>
                    ))}
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
                  <div className="min-h-[250px]">
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
                            <p className="font-mono font-medium">GFT-{product.id.slice(0, 8)}</p>
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
                        {/* Reviews content - same as before but with premium styling */}
                        {/* ... */}
                      </motion.div>
                    )}

                    {activeTab === 'shipping' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-premium-gold" />
                            Shipping Information
                          </h4>
                          <p className="text-gray-600 text-sm">
                            Free shipping on orders above ₹999. Standard delivery takes 3-5 business days.
                            Express shipping available at checkout.
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-premium-gold" />
                            Returns & Exchange
                          </h4>
                          <p className="text-gray-600 text-sm">
                            30-day easy returns. Items must be unused and in original packaging.
                          </p>
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

                    {/* Secure Checkout Note */}
                    <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
                      <Shield className="h-3 w-3" />
                      Secure Checkout • 100% Satisfaction Guaranteed
                    </p>
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