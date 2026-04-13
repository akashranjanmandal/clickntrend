import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Star, ChevronLeft, ChevronRight,
  ThumbsUp, MessageCircle, PenTool, Truck,
  Package, Sparkles, Check, Ruler, Share2,
  Shield, RefreshCw, ArrowLeft, Filter
} from 'lucide-react';
import { Product, Review, ProductColor, ProductSize } from '../types';
import { formatCurrency, getImageUrl, getProductImage } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';
import ProductCustomizationModal from '../components/ProductCustomizationModal';

/* ─── Dynamic OG / Twitter meta helper ─── */
const setMetaTags = (title: string, description: string, imageUrl: string, url: string) => {
  const upsert = (selector: string, attrName: string, attrVal: string, contentVal: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', contentVal);
  };
  document.title = `${title} — GFTD`;
  upsert('meta[name="description"]', 'name', 'description', description);
  upsert('meta[property="og:title"]', 'property', 'og:title', title);
  upsert('meta[property="og:description"]', 'property', 'og:description', description);
  upsert('meta[property="og:image"]', 'property', 'og:image', imageUrl);
  upsert('meta[property="og:url"]', 'property', 'og:url', url);
  upsert('meta[property="og:type"]', 'property', 'og:type', 'product');
  upsert('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsert('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  upsert('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  upsert('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
};

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [helpfulReviews, setHelpfulReviews] = useState<string[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  const [colors, setColors] = useState<ProductColor[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);

  const [reviewForm, setReviewForm] = useState({ user_name: '', user_email: '', rating: 5, comment: '' });
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (id) fetchProduct(id); }, [id]);

  // Auto-slide images every 3 seconds
  useEffect(() => {
    const images = getCurrentImages();
    if (images.length <= 1) return;
    autoSlideRef.current = setInterval(() => {
      setSelectedImage(prev => (prev + 1) % images.length);
    }, 3000);
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  }, [colors, selectedColor, product]);

  const pauseAutoSlide = () => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
  };

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/products/${productId}`);
      setProduct(data);

      // Set OG meta tags for sharing
      const imgUrl = getImageUrl(data.image_url || '');
      const desc = data.description || `Shop ${data.name} — premium gifts at great prices.`;
      setMetaTags(data.name, desc, imgUrl, window.location.href);

      const productColors: ProductColor[] = data.colors || [];
      const productSizes: ProductSize[] = data.sizes || [];
      setColors(productColors);
      setSizes(productSizes);
      const defColor = productColors.find((c: ProductColor) => c.is_active);
      if (defColor) setSelectedColor(defColor);
      const defSize = productSizes.find((s: ProductSize) => s.is_active);
      if (defSize) setSelectedSize(defSize);

      fetchReviews(productId);
      fetchRelatedProducts(data);
    } catch (err) {
      toast.error('Product not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (productId: string) => {
    try {
      setLoadingReviews(true);
      const data = await apiFetch(`/api/reviews/product/${productId}`);
      setReviews((data || []).filter((r: Review) => r.is_approved));
    } catch { } finally { setLoadingReviews(false); }
  };

  const fetchRelatedProducts = async (currentProduct: Product) => {
    try {
      const categoryName =
        currentProduct.categories?.[0]?.name ||
        currentProduct.category;
      if (!categoryName) return;

      const allProducts: Product[] = await apiFetch('/api/products');
      const related = (allProducts || [])
        .filter(p =>
          p.id !== currentProduct.id &&
          p.is_active &&
          (
            p.categories?.some((c: any) => c.name === categoryName) ||
            p.category === categoryName
          )
        )
        .slice(0, 4);
      setRelatedProducts(related);
    } catch { /* non-critical */ }
  };

  const getCurrentImages = () => {
    if (selectedColor?.image_url) return [selectedColor.image_url, ...(selectedColor.additional_images || [])];
    if (product?.has_colors && colors.length > 0) {
      const first = colors.find(c => c.is_active !== false);
      if (first?.image_url) return [first.image_url, ...(first.additional_images || [])];
    }
    if (!product) return [];
    return product.additional_images?.length ? [product.image_url, ...product.additional_images] : [product.image_url];
  };

  const getCurrentPrice = () => {
    if (!product) return 0;
    let price = parseFloat(String(product.price)) || 0;
    if (selectedColor) price += parseFloat(String(selectedColor.price_modifier)) || 0;
    if (selectedSize) price += parseFloat(String(selectedSize.price_modifier)) || 0;
    return price;
  };

  const getCurrentStock = () => {
    if (selectedColor && selectedSize) return Math.min(selectedColor.stock_quantity, selectedSize.stock_quantity);
    if (selectedColor) return selectedColor.stock_quantity;
    if (selectedSize) return selectedSize.stock_quantity;
    return product?.stock_quantity ?? 0;
  };

  const getCurrentImage = () => {
    if (selectedColor?.image_url) return selectedColor.image_url;
    if (product?.has_colors && colors.length > 0) {
      const first = colors.find(c => c.is_active !== false);
      if (first?.image_url) return first.image_url;
    }
    return product?.image_url || '';
  };

  const handleAddToCart = () => {
    if (!product) return;
    const currentStock = getCurrentStock();
    if (currentStock < quantity) { toast.error(`Only ${currentStock} items available`); return; }
    const name = product.name
      + (selectedColor ? ` (${selectedColor.color_name}` + (selectedSize ? `, ${selectedSize.size_name})` : ')') : '')
      + (!selectedColor && selectedSize ? ` (${selectedSize.size_name})` : '');
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: `${product.id}-${selectedColor?.id || ''}-${selectedSize?.id || ''}-${Date.now()}-${i}`,
        name, price: getCurrentPrice(), quantity: 1, image_url: getCurrentImage(), type: 'product',
        category: product.category,
        color_id: selectedColor?.id, color_name: selectedColor?.color_name, color_code: selectedColor?.color_code,
        size_id: selectedSize?.id, size_name: selectedSize?.size_name, size_code: selectedSize?.size_code,
      });
    }
    toast.success(`${quantity} item${quantity > 1 ? 's' : ''} added to cart!`);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.user_name.trim() || !reviewForm.comment.trim()) { toast.error('Please fill in all required fields'); return; }
    setSubmitting(true);
    try {
      await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify({ product_id: product?.id, ...reviewForm }) });
      toast.success('Review submitted! Pending approval.');
      setShowReviewForm(false);
      setReviewForm({ user_name: '', user_email: '', rating: 5, comment: '' });
    } catch (err: any) { toast.error(err.message || 'Failed to submit review'); }
    finally { setSubmitting(false); }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: product?.name || '',
      text: product?.description || `Check out ${product?.name}!`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      }
    } catch { /* user cancelled */ }
  };

  const averageRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const activeColors = colors.filter(c => c.is_active);
  const activeSizes = sizes.filter(s => s.is_active);
  const currentStock = getCurrentStock();
  const productImages = getCurrentImages();
  const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
    rating: r, count: reviews.filter(rv => rv.rating === r).length,
    pct: reviews.length ? (reviews.filter(rv => rv.rating === r).length / reviews.length) * 100 : 0
  }));
  const getSortedReviews = () => {
    if (reviewSort === 'highest') return [...reviews].sort((a, b) => b.rating - a.rating);
    if (reviewSort === 'lowest') return [...reviews].sort((a, b) => a.rating - b.rating);
    return [...reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading product…</p>
      </div>
    </div>
  );
  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky breadcrumb */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 text-xs sm:text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-yellow-600 flex-shrink-0"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
          <span>/</span><button onClick={() => navigate('/')} className="hover:text-yellow-600 flex-shrink-0">Home</button>
          {product.category && <><span>/</span><span className="text-gray-400 flex-shrink-0">{product.category}</span></>}
          <span>/</span><span className="text-gray-800 font-medium truncate max-w-[140px] sm:max-w-xs">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Mobile: stack, Desktop: 5+7 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

          {/* ── Images ── */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-16">
              <div
                className="relative bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm group"
                style={{ aspectRatio: '1/1' }}
              >
                <img
                  src={getImageUrl(productImages[selectedImage])}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                />
                {productImages.length > 1 && (
                  <>
                    <button
                      onClick={() => { pauseAutoSlide(); setSelectedImage(p => (p - 1 + productImages.length) % productImages.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    ><ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                    <button
                      onClick={() => { pauseAutoSlide(); setSelectedImage(p => (p + 1) % productImages.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    ><ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {productImages.map((_, i) => (
                        <button key={i} onClick={() => { pauseAutoSlide(); setSelectedImage(i); }}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${selectedImage === i ? 'bg-yellow-500 w-3' : 'bg-white/60'}`} />
                      ))}
                    </div>
                  </>
                )}
                {product.discount_percentage && (
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">-{product.discount_percentage}% OFF</div>
                )}
                {product.is_customizable && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><Sparkles className="h-3 w-3" /> Custom</div>
                )}
              </div>

              {/* Thumbnails */}
              {productImages.length > 1 && (
                <div className="flex gap-2 mt-2 sm:mt-3 overflow-x-auto pb-1">
                  {productImages.map((url, idx) => (
                    <button key={idx} onClick={() => { pauseAutoSlide(); setSelectedImage(idx); }}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-yellow-500 shadow' : 'border-gray-200 hover:border-yellow-300'}`}>
                      <img src={getImageUrl(url)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust badges - desktop */}
              <div className="hidden sm:grid grid-cols-3 gap-2 mt-4">
                {[
                  { icon: Shield, label: 'Secure Pay', sub: '100% safe' },
                  { icon: Truck, label: 'Free Ship', sub: 'All orders' },
                  { icon: RefreshCw, label: 'Returns', sub: '7-day policy' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="bg-white rounded-xl p-3 text-center border">
                    <Icon className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
                    <p className="text-xs font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Product info ── */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4">

            {/* Title + price */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex-1">{product.name}</h1>
                <button onClick={handleShare} className="p-2 rounded-full hover:bg-gray-100 flex-shrink-0 transition-colors" title="Share product">
                  <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <div className="flex">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />)}</div>
                  <span className="text-xs font-semibold text-gray-700">{averageRating > 0 ? averageRating.toFixed(1) : '0.0'}</span>
                  <span className="text-xs text-gray-400">({reviews.length})</span>
                </div>
                {product.category && <span className="flex items-center gap-1 text-xs text-gray-500"><Package className="h-3 w-3" />{product.category}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-2 sm:gap-3">
                <span className="text-3xl sm:text-4xl font-bold text-yellow-600">{formatCurrency(getCurrentPrice())}</span>
                {product.original_price && <>
                  <span className="text-base sm:text-xl text-gray-400 line-through">{formatCurrency(product.original_price)}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Save {formatCurrency(product.original_price - getCurrentPrice())}</span>
                </>}
              </div>
              <p className="text-xs text-gray-400 mt-1">Inclusive of all taxes • Free delivery</p>
            </div>

            {/* ── Variants ── */}
            {(product.has_colors || product.has_sizes) && (
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                {product.has_colors && activeColors.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Colour: <span className="font-normal text-gray-500">{selectedColor?.color_name || 'Select'}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeColors.map(color => (
                        <button key={color.id} onClick={() => { setSelectedColor(color); setSelectedImage(0); pauseAutoSlide(); }}
                          className={`relative flex flex-col items-center gap-1 p-2 border-2 rounded-xl transition-all min-w-[60px] ${selectedColor?.id === color.id ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'}`}>
                          {color.image_url ? (
                            <img
                              src={getImageUrl(color.image_url)}
                              alt={color.color_name}
                              className="w-8 h-8 rounded-lg object-cover border border-gray-100"
                              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full border border-gray-200" style={{ backgroundColor: color.color_code || '#ccc' }} />
                          )}
                          <span className="text-xs font-medium leading-tight text-center max-w-[56px]">{color.color_name}</span>
                          {color.price_modifier !== 0 && <span className="text-xs text-yellow-600">{color.price_modifier > 0 ? '+' : ''}{formatCurrency(color.price_modifier)}</span>}
                          {selectedColor?.id === color.id && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {product.has_sizes && activeSizes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <Ruler className="h-4 w-4" /> Size: <span className="font-normal text-gray-500 ml-1">{selectedSize?.size_name || 'Select'}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeSizes.map(size => (
                        <button key={size.id} onClick={() => setSelectedSize(size)}
                          className={`relative px-3 py-1.5 border-2 rounded-xl text-sm transition-all ${selectedSize?.id === size.id ? 'border-yellow-500 bg-yellow-50 font-semibold' : 'border-gray-200 hover:border-yellow-300'}`}>
                          {size.size_name}{size.size_code && <span className="text-xs text-gray-400 ml-1">({size.size_code})</span>}
                          {selectedSize?.id === size.id && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Qty + Add to Cart */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3 ${currentStock > 10 ? 'bg-green-50 text-green-700' : currentStock > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${currentStock > 10 ? 'bg-green-500 animate-pulse' : currentStock > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                {currentStock > 10 ? 'In Stock' : currentStock > 0 ? `Only ${currentStock} left!` : 'Out of Stock'}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-medium text-gray-700">Qty:</span>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 text-lg font-medium">−</button>
                  <span className="w-10 text-center font-semibold border-x-2 border-gray-200 h-9 flex items-center justify-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(currentStock, q + 1))} disabled={quantity >= currentStock} className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 text-lg font-medium disabled:opacity-40">+</button>
                </div>
              </div>
              {product.is_customizable ? (
                <button onClick={() => setShowCustomization(true)} className="w-full py-3.5 sm:py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-2 font-semibold text-base sm:text-lg shadow-md">
                  <PenTool className="h-4 w-4 sm:h-5 sm:w-5" /> Customize & Add
                </button>
              ) : (
                <button onClick={handleAddToCart} disabled={currentStock === 0} className="w-full py-3.5 sm:py-4 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 active:scale-95 transition-all flex items-center justify-center gap-2 font-semibold text-base sm:text-lg shadow-md disabled:opacity-50">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" /> Add to Cart · {formatCurrency(getCurrentPrice() * quantity)}
                </button>
              )}
            </div>

            {/* Mobile trust badges */}
            <div className="grid grid-cols-3 gap-2 sm:hidden">
              {[{ icon: Shield, label: 'Secure Pay' }, { icon: Truck, label: 'Free Ship' }, { icon: RefreshCw, label: '7-Day Return' }].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-white rounded-xl p-2.5 text-center border">
                  <Icon className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                </div>
              ))}
            </div>

            {/* Details / Reviews tabs */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b">
                {(['details', 'reviews'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'text-yellow-600 border-b-2 border-yellow-500 bg-yellow-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    {tab}
                    {tab === 'reviews' && reviews.length > 0 && <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{reviews.length}</span>}
                  </button>
                ))}
              </div>
              <div className="p-4 sm:p-5">
                {activeTab === 'details' && (
                  <div>
                    <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
                      {[
                        { label: 'Gender', value: product.gender ? product.gender.charAt(0).toUpperCase() + product.gender.slice(1) : '—' },
                        ...(product.is_customizable ? [{ label: 'Customizable', value: 'Yes ✦' }] : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-2.5 sm:p-3">
                          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                    {reviews.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                        <div className="text-center flex-shrink-0">
                          <p className="text-4xl sm:text-5xl font-bold text-gray-800">{averageRating.toFixed(1)}</p>
                          <div className="flex justify-center my-1">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />)}</div>
                          <p className="text-xs text-gray-400">{reviews.length} ratings</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {ratingDistribution.map(({ rating, count, pct }) => (
                            <div key={rating} className="flex items-center gap-2 text-xs">
                              <span className="w-7 text-right text-gray-500">{rating} ★</span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                              <span className="w-5 text-gray-400">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button onClick={() => setShowReviewForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 text-xs sm:text-sm font-medium transition-colors">
                        <MessageCircle className="h-3.5 w-3.5" /> Write a Review
                      </button>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Filter className="h-3.5 w-3.5" />
                        <select value={reviewSort} onChange={e => setReviewSort(e.target.value as any)} className="border rounded-xl px-2 py-1.5 text-xs bg-white focus:outline-none">
                          <option value="newest">Newest</option>
                          <option value="highest">Highest</option>
                          <option value="lowest">Lowest</option>
                        </select>
                      </div>
                    </div>
                    {showReviewForm && (
                      <div className="border-2 border-yellow-200 rounded-xl p-3 sm:p-4 bg-yellow-50/30">
                        <h4 className="font-semibold mb-3 text-sm sm:text-base text-gray-800">Write a Review</h4>
                        <form onSubmit={handleSubmitReview} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                              <input type="text" value={reviewForm.user_name} onChange={e => setReviewForm({ ...reviewForm, user_name: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-yellow-400" required />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Email (optional)</label>
                              <input type="email" value={reviewForm.user_email} onChange={e => setReviewForm({ ...reviewForm, user_email: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-yellow-400" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Rating *</label>
                            <div className="flex gap-1.5">{[1, 2, 3, 4, 5].map(s => <button key={s} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: s })}><Star className={`h-6 w-6 transition-colors ${s <= reviewForm.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} /></button>)}</div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Review *</label>
                            <textarea value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-yellow-400 resize-none" required />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={submitting} className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit'}</button>
                            <button type="button" onClick={() => setShowReviewForm(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-100">Cancel</button>
                          </div>
                        </form>
                      </div>
                    )}
                    {loadingReviews ? (
                      <div className="text-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div></div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-8 text-gray-400"><MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No reviews yet. Be the first!</p></div>
                    ) : (
                      <div className="space-y-4">
                        {getSortedReviews().map(review => (
                          <div key={review.id} className="border-b pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <div className="flex">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />)}</div>
                                  <span className="text-xs sm:text-sm font-semibold text-gray-800">{review.user_name}</span>
                                </div>
                                <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              </div>
                              <button onClick={() => setHelpfulReviews(h => h.includes(review.id) ? h.filter(x => x !== review.id) : [...h, review.id])}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${helpfulReviews.includes(review.id) ? 'bg-green-50 text-green-600' : 'hover:bg-gray-100 text-gray-500'}`}>
                                <ThumbsUp className="h-3 w-3" /> Helpful
                              </button>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">You May Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {relatedProducts.map((rp) => {
                const rpImage = getProductImage(rp);
                const savePct = rp.discount_percentage || 0;
                return (
                  <button
                    key={rp.id}
                    onClick={() => navigate(`/product/${rp.id}`)}
                    className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group text-left"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={getImageUrl(rpImage)}
                        alt={rp.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                      />
                      {savePct > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          -{savePct}%
                        </span>
                      )}
                      {rp.is_customizable && (
                        <span className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> Custom
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 sm:p-3">
                      <p className="font-semibold text-xs sm:text-sm text-gray-800 line-clamp-2 leading-tight">{rp.name}</p>
                      <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-yellow-600">{formatCurrency(rp.price)}</span>
                        {rp.original_price && rp.original_price > rp.price && (
                          <span className="text-xs text-gray-400 line-through">{formatCurrency(rp.original_price)}</span>
                        )}
                      </div>
                      {rp.category && (
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{rp.category}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCustomization && product && (
        <ProductCustomizationModal product={product} selectedImageUrl={getCurrentImage()} onClose={() => setShowCustomization(false)} />
      )}
    </div>
  );
};

export default ProductPage;
