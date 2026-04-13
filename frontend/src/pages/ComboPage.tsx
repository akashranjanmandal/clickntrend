import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, AlertCircle, PenTool, Share2, ArrowLeft, ChevronLeft, ChevronRight, Truck, Shield, RefreshCw, Check, Tag } from 'lucide-react';
import { Combo, ComboProduct, CustomizationData, Product } from '../types';
import { getImageUrl, formatCurrency, getProductImage } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { apiFetch } from '../utils/api';
import ProductCustomizationModal from '../components/ProductCustomizationModal';
import toast from 'react-hot-toast';

const ComboPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [combo, setCombo] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Map<string, { colorId?: string; colorName?: string; colorCode?: string; colorImage?: string; sizeId?: string; sizeName?: string; sizeCode?: string; }>>(new Map());
  const [customizationStep, setCustomizationStep] = useState<number | null>(null);
  const [collectedCustomizations, setCollectedCustomizations] = useState<Record<number, CustomizationData>>({});
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (id) fetchCombo(id); }, [id]);

  useEffect(() => {
    if (!combo) return;
    const imgs = getAllImages(combo);
    if (imgs.length <= 1) return;
    autoSlideRef.current = setInterval(() => setSelectedImageIdx(p => (p + 1) % imgs.length), 3000);
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  }, [combo]);

  const pauseSlide = () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  const getAllImages = (c: Combo) => [c.image_url, ...(c.additional_images || [])].filter(Boolean) as string[];

  const fetchCombo = async (comboId: string) => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/combos/${comboId}`);
      setCombo(data);
    } catch { toast.error('Combo not found'); navigate('/'); }
    finally { setLoading(false); }
  };

  const setVariant = (productId: string, update: object) => {
    setSelectedVariants(prev => { const next = new Map(prev); next.set(productId, { ...(next.get(productId) || {}), ...update }); return next; });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div><p className="text-gray-500">Loading combo…</p></div>
    </div>
  );
  if (!combo) return null;

  const comboProducts = combo.combo_products || combo.products || [];
  const allImages = getAllImages(combo);
  const originalPrice = comboProducts.reduce((sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1), 0);
  const finalPrice = combo.discount_price != null ? combo.discount_price : originalPrice;
  const savings = combo.discount_price != null && combo.discount_price < originalPrice ? originalPrice - combo.discount_price : 0;
  const savingsPercentage = savings > 0 ? Math.round((savings / originalPrice) * 100) : 0;
  const customizableItems = comboProducts.filter(item => item.product?.is_customizable);

  const validateVariants = (): boolean => {
    for (const item of comboProducts) {
      const p = item.product; if (!p) continue;
      const v = selectedVariants.get(p.id) || {};
      if (p.has_colors && p.colors && p.colors.length > 0 && !v.colorId) { toast.error(`Select colour for ${p.name}`); return false; }
      if (p.has_sizes && p.sizes && p.sizes.length > 0 && !v.sizeId) { toast.error(`Select size for ${p.name}`); return false; }
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!validateVariants()) return;
    if (customizableItems.length > 0) setCustomizationStep(0);
    else commitToCart({});
  };

  const handleCustomizationComplete = (data: CustomizationData) => {
    const idx = customizationStep!;
    const updated = { ...collectedCustomizations, [idx]: data };
    setCollectedCustomizations(updated);
    const next = idx + 1;
    if (next < customizableItems.length) setCustomizationStep(next);
    else { setCustomizationStep(null); commitToCart(updated); }
  };

  const commitToCart = (customizations: Record<number, CustomizationData>) => {
    const payload = comboProducts.map((item) => {
      const p = item.product; const v = p ? (selectedVariants.get(p.id) || {}) : {};
      const cidx = customizableItems.findIndex(ci => ci.product?.id === p?.id);
      return { id: p?.id || '', name: p?.name || '', quantity: item.quantity, price: p?.price || 0,
        image_url: v.colorImage || (p ? (p.image_url || '') : ''), customization: cidx >= 0 ? customizations[cidx] : undefined,
        color_id: v.colorId, color_name: v.colorName, color_code: v.colorCode, size_id: v.sizeId, size_name: v.sizeName, size_code: v.sizeCode };
    });
    addItem({ id: `combo-${combo.id}-${Date.now()}`, name: combo.name, price: finalPrice, quantity: 1, image_url: combo.image_url || '', type: 'combo', combo_products: payload } as any);
    toast.success('Combo added to cart!');
    navigate('/');
  };

  const currentProduct = customizationStep !== null ? customizableItems[customizationStep]?.product : undefined;
  const getCurrentColorImage = () => { if (!currentProduct) return undefined; const v = selectedVariants.get(currentProduct.id) || {}; return v.colorImage || currentProduct.image_url || undefined; };
  const needsSelection = comboProducts.some(item => {
    const p = item.product; if (!p) return false; const v = selectedVariants.get(p.id) || {};
    return (p.has_colors && p.colors && p.colors.length > 0 && !v.colorId) || (p.has_sizes && p.sizes && p.sizes.length > 0 && !v.sizeId);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 text-xs sm:text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-yellow-600 flex-shrink-0"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
          <span>/</span><button onClick={() => navigate('/')} className="hover:text-yellow-600 flex-shrink-0">Home</button>
          <span>/</span><button onClick={() => navigate('/combos')} className="hover:text-yellow-600 flex-shrink-0">Combos</button>
          <span>/</span><span className="text-gray-800 font-medium truncate max-w-[140px] sm:max-w-xs">{combo.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

          {/* Images */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-16">
              <div className="relative bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm group" style={{ aspectRatio: '1/1' }}>
                <img src={getImageUrl(allImages[selectedImageIdx] || '')} alt={combo.name}
                  className="w-full h-full object-cover transition-transform duration-500"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                {allImages.length > 1 && (
                  <>
                    <button onClick={() => { pauseSlide(); setSelectedImageIdx(i => (i - 1 + allImages.length) % allImages.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                    <button onClick={() => { pauseSlide(); setSelectedImageIdx(i => (i + 1) % allImages.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, i) => <button key={i} onClick={() => { pauseSlide(); setSelectedImageIdx(i); }} className={`h-1.5 rounded-full transition-all ${selectedImageIdx === i ? 'bg-yellow-500 w-3' : 'bg-white/60 w-1.5'}`} />)}
                    </div>
                  </>
                )}
                {savingsPercentage > 0 && <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">-{savingsPercentage}% OFF</div>}
                {customizableItems.length > 0 && <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><PenTool className="h-2.5 w-2.5" /> Customisable</div>}
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 mt-2 sm:mt-3 overflow-x-auto pb-1">
                  {allImages.map((url, idx) => (
                    <button key={idx} onClick={() => { pauseSlide(); setSelectedImageIdx(idx); }}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all ${selectedImageIdx === idx ? 'border-yellow-500 shadow' : 'border-gray-200 hover:border-yellow-300'}`}>
                      <img src={getImageUrl(url)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                    </button>
                  ))}
                </div>
              )}
              <div className="hidden sm:grid grid-cols-3 gap-2 mt-4">
                {[{ icon: Shield, label: 'Secure Pay', sub: '100% safe' }, { icon: Truck, label: 'Free Ship', sub: 'All orders' }, { icon: RefreshCw, label: 'Returns', sub: '7-day policy' }].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="bg-white rounded-xl p-3 text-center border"><Icon className="h-4 w-4 mx-auto text-yellow-600 mb-1" /><p className="text-xs font-medium text-gray-700">{label}</p><p className="text-xs text-gray-400">{sub}</p></div>
                ))}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4">

            {/* Title + price */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Tag className="h-3 w-3" /> Combo</span>
                    {combo.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{combo.category}</span>}
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">{combo.name}</h1>
                </div>
                <button onClick={() => { const url = window.location.href; if (navigator.share) navigator.share({ title: combo.name, url }).catch(() => {}); else navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => {}); }} className="p-2 rounded-full hover:bg-gray-100 flex-shrink-0">
                  <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                </button>
              </div>
              {combo.description && <p className="text-gray-500 text-xs sm:text-sm mt-2 leading-relaxed">{combo.description}</p>}
              <div className="mt-3 flex flex-wrap items-baseline gap-2 sm:gap-3">
                <span className="text-3xl sm:text-4xl font-bold text-yellow-600">{formatCurrency(finalPrice)}</span>
                {savings > 0 && <>
                  <span className="text-base sm:text-xl text-gray-400 line-through">{formatCurrency(originalPrice)}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Save {formatCurrency(savings)} ({savingsPercentage}%)</span>
                </>}
              </div>
              <p className="text-xs text-gray-400 mt-1">Inclusive of all taxes • Free delivery</p>
            </div>

            {/* Included items */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><Package className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" /> Included Items ({comboProducts.length})</h2>
              <div className="space-y-3">
                {comboProducts.map((item: ComboProduct, idx: number) => {
                  const p = item.product; if (!p) return null;
                  const v = selectedVariants.get(p.id) || {};
                  // Use selected colour image → first active colour image → product image_url
                  const displayImg = v.colorImage
                    || (p.colors && p.colors.length > 0 ? (p.colors.find((c: any) => c.is_active)?.image_url || p.image_url) : p.image_url)
                    || p.image_url
                    || '';
                  const hasColors = p.has_colors && p.colors && p.colors.length > 0;
                  const hasSizes = p.has_sizes && p.sizes && p.sizes.length > 0;
                  const allOk = (!hasColors || !!v.colorId) && (!hasSizes || !!v.sizeId);
                  return (
                    <div key={idx} className={`p-3 sm:p-4 rounded-xl border-2 transition-colors ${allOk ? 'border-green-100 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <img src={getImageUrl(displayImg)} alt={p.name} className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl" onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                          {allOk && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-xs sm:text-sm text-gray-800">{p.name}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatCurrency(p.price)}</p>
                              {p.is_customizable && <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full"><PenTool className="h-2 w-2" /> Customisable</span>}
                            </div>
                            <p className="font-bold text-xs sm:text-sm text-gray-800 flex-shrink-0">{formatCurrency(p.price * item.quantity)}</p>
                          </div>
                          {hasColors && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-600 mb-1">Colour: {v.colorName ? <span className="text-green-600">{v.colorName}</span> : <span className="text-red-500">select</span>}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {p.colors!.filter(c => c.is_active).map(color => (
                                  <button key={color.id} onClick={() => setVariant(p.id, { colorId: color.id, colorName: color.color_name, colorCode: color.color_code, colorImage: color.image_url })}
                                    className={`relative flex flex-col items-center gap-0.5 p-1.5 border-2 rounded-lg transition-all ${v.colorId === color.id ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'}`} title={color.color_name}>
                                    <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: color.color_code || '#ccc' }} />
                                    <span className="text-[10px] font-medium max-w-[44px] text-center leading-tight">{color.color_name}</span>
                                    {v.colorId === color.id && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center"><Check className="h-2 w-2 text-white" /></span>}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {hasSizes && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-600 mb-1">Size: {v.sizeName ? <span className="text-green-600">{v.sizeName}</span> : <span className="text-red-500">select</span>}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {p.sizes!.filter(s => s.is_active).map(size => (
                                  <button key={size.id} onClick={() => setVariant(p.id, { sizeId: size.id, sizeName: size.size_name, sizeCode: size.size_code })}
                                    className={`px-2.5 py-1 text-xs border-2 rounded-lg font-medium transition-all ${v.sizeId === size.id ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-600 hover:border-yellow-300'}`}>
                                    {size.size_code || size.size_name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {customizableItems.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 shadow-sm flex items-start gap-3 border-l-4 border-purple-500">
                <AlertCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-purple-800">Personalisation included</p>
                  <p className="text-xs text-purple-600 mt-0.5">You'll personalise {customizableItems.length} item{customizableItems.length > 1 ? 's' : ''} after clicking Add to Cart.</p>
                </div>
              </div>
            )}

            {needsSelection && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-semibold text-amber-800 mb-1.5">⚠️ Selection required:</p>
                <ul className="space-y-1">
                  {comboProducts.map(item => {
                    const p = item.product; if (!p) return null;
                    const v = selectedVariants.get(p.id) || {};
                    const nc = p.has_colors && p.colors && p.colors.length > 0 && !v.colorId;
                    const ns = p.has_sizes && p.sizes && p.sizes.length > 0 && !v.sizeId;
                    if (!nc && !ns) return null;
                    return <li key={p.id} className="text-xs text-amber-700 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><strong>{p.name}</strong>{nc && ' — colour'}{nc && ns && ' &'}{ns && ' size'}</li>;
                  })}
                </ul>
              </div>
            )}

            {/* Price summary + CTA */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="space-y-1.5 mb-4 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-500"><span>Products MRP</span><span className={savings > 0 ? 'line-through text-gray-400' : ''}>{formatCurrency(originalPrice)}</span></div>
                {savings > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Combo Discount</span><span>-{formatCurrency(savings)}</span></div>}
                <div className="flex justify-between text-green-600"><span>Shipping</span><span className="font-medium">FREE</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-sm sm:text-base"><span>Total</span><span className="text-yellow-600 text-lg sm:text-xl">{formatCurrency(finalPrice)}</span></div>
              </div>
              <button onClick={handleAddToCart} className="w-full py-3.5 sm:py-4 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 active:scale-95 transition-all font-semibold text-base sm:text-lg flex items-center justify-center gap-2 shadow-md">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {customizableItems.length > 0 ? 'Personalise & Add to Cart' : `Add Combo · ${formatCurrency(finalPrice)}`}
              </button>
            </div>

            {/* Mobile trust badges */}
            <div className="grid grid-cols-3 gap-2 sm:hidden">
              {[{ icon: Shield, label: 'Secure Pay' }, { icon: Truck, label: 'Free Ship' }, { icon: RefreshCw, label: '7-Day Return' }].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-white rounded-xl p-2.5 text-center border"><Icon className="h-4 w-4 mx-auto text-yellow-600 mb-1" /><p className="text-xs font-medium text-gray-700">{label}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {customizationStep !== null && currentProduct && (
        <ProductCustomizationModal product={currentProduct as Product} selectedImageUrl={getCurrentColorImage()} onClose={() => { setCustomizationStep(null); setCollectedCustomizations({}); }} onCustomizeComplete={handleCustomizationComplete} />
      )}
    </div>
  );
};

export default ComboPage;
