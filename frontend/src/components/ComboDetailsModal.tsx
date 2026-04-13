import React, { useState } from 'react';
import { X, ShoppingCart, Package, AlertCircle, PenTool, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Combo, ComboProduct, CustomizationData, Product } from '../types';
import { getImageUrl, formatCurrency, getProductImage } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import ProductCustomizationModal from './ProductCustomizationModal';
import toast from 'react-hot-toast';

interface ComboDetailsModalProps {
  combo: Combo;
  onClose: () => void;
}

const ComboDetailsModal: React.FC<ComboDetailsModalProps> = ({ combo, onClose }) => {
  const { addItem } = useCart();
  const comboProducts = combo.combo_products || [];

  const originalPrice = comboProducts.reduce(
    (sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1),
    0
  );
  const finalPrice = combo.discount_price != null ? combo.discount_price : originalPrice;
  const savings = combo.discount_price != null && combo.discount_price < originalPrice
    ? originalPrice - combo.discount_price : 0;
  const savingsPercentage = savings > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  const allImages = [combo.image_url, ...((combo.additional_images || []))].filter(Boolean) as string[];
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  // Variant selection: productId -> chosen color/size
  const [selectedVariants, setSelectedVariants] = useState<Map<string, {
    colorId?: string; colorName?: string; colorCode?: string; colorImage?: string;
    sizeId?: string; sizeName?: string; sizeCode?: string;
  }>>(new Map());

  const setVariant = (productId: string, update: object) => {
    setSelectedVariants(prev => {
      const next = new Map(prev);
      next.set(productId, { ...(next.get(productId) || {}), ...update });
      return next;
    });
  };

  // Customisation step-through
  const customizableItems = comboProducts.filter(item => item.product?.is_customizable);
  const [customizationStep, setCustomizationStep] = useState<number | null>(null);
  const [collectedCustomizations, setCollectedCustomizations] = useState<Record<number, CustomizationData>>({});

  const validateVariants = (): boolean => {
    for (const item of comboProducts) {
      const p = item.product;
      if (!p) continue;
      const v = selectedVariants.get(p.id) || {};
      if (p.has_colors && p.colors && p.colors.length > 0 && !v.colorId) {
        toast.error(`Please select a color for ${p.name}`);
        return false;
      }
      if (p.has_sizes && p.sizes && p.sizes.length > 0 && !v.sizeId) {
        toast.error(`Please select a size for ${p.name}`);
        return false;
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!validateVariants()) return;
    if (customizableItems.length > 0) {
      setCustomizationStep(0);
    } else {
      commitToCart({});
    }
  };

  const handleCustomizationComplete = (data: CustomizationData) => {
    const currentIdx = customizationStep!;
    const updated = { ...collectedCustomizations, [currentIdx]: data };
    setCollectedCustomizations(updated);
    const nextIdx = currentIdx + 1;
    if (nextIdx < customizableItems.length) {
      setCustomizationStep(nextIdx);
    } else {
      setCustomizationStep(null);
      commitToCart(updated);
    }
  };

  const handleCustomizationClose = () => {
    setCustomizationStep(null);
    setCollectedCustomizations({});
  };

  const commitToCart = (customizations: Record<number, CustomizationData>) => {
    const comboProductsPayload = comboProducts.map((item, idx) => {
      const p = item.product;
      const v = p ? (selectedVariants.get(p.id) || {}) : {};
      const customizableIdx = customizableItems.findIndex(ci => ci.product?.id === p?.id);
      const customization = customizableIdx >= 0 ? customizations[customizableIdx] : undefined;
      const imgSrc = v.colorImage || (p ? getProductImage(p) : '');
      return {
        id: p?.id || '',
        name: p?.name || '',
        quantity: item.quantity,
        price: p?.price || 0,
        image_url: imgSrc,
        customization,
        color_id: v.colorId,
        color_name: v.colorName,
        color_code: v.colorCode,
        size_id: v.sizeId,
        size_name: v.sizeName,
        size_code: v.sizeCode,
      };
    });

    addItem({
      id: `combo-${combo.id}-${Date.now()}`,
      name: combo.name,
      price: finalPrice,
      quantity: 1,
      image_url: combo.image_url || '',
      type: 'combo',
      combo_products: comboProductsPayload,
    } as any);

    toast.success('Combo added to cart!');
    onClose();
  };

  const currentCustomizableItem = customizationStep !== null ? customizableItems[customizationStep] : null;
  
  // Get the product for the current customization step
  const currentProduct = currentCustomizableItem?.product;
  
  // Get the selected color image for the current product
  const getCurrentColorImage = () => {
    if (!currentProduct) return undefined;
    const v = selectedVariants.get(currentProduct.id) || {};
    return v.colorImage || getProductImage(currentProduct);
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/combos?id=${combo.id}`;
                  if (navigator.share) {
                    navigator.share({ title: combo.name, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).then(() => toast.success('Combo link copied!')).catch(() => {});
                  }
                }}
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-colors"
                title="Share combo"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Image carousel */}
                <div className="space-y-3">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={getImageUrl(allImages[selectedImageIdx] || combo.image_url)}
                      alt={combo.name}
                      className="w-full h-full object-cover transition-opacity duration-200"
                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                    />
                    {savings > 0 && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg">
                        <span className="font-bold">Save {savingsPercentage}%</span>
                      </div>
                    )}
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedImageIdx(i => (i - 1 + allImages.length) % allImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                          onClick={() => setSelectedImageIdx(i => (i + 1) % allImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImages.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImageIdx(i)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImageIdx === i ? 'border-premium-gold shadow' : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img src={getImageUrl(url)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-serif font-bold text-premium-charcoal">{combo.name}</h2>
                  <p className="text-gray-600 leading-relaxed">{combo.description}</p>

                  {/* Products List with variant pickers */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Package className="h-5 w-5 text-premium-gold" />
                      Included Items ({comboProducts.length})
                    </h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {comboProducts.map((item: ComboProduct, idx: number) => {
                        const p = item.product;
                        if (!p) return null;
                        const v = selectedVariants.get(p.id) || {};
                        const displayImg = v.colorImage || getProductImage(p);
                        const hasColors = p.has_colors && p.colors && p.colors.length > 0;
                        const hasSizes = p.has_sizes && p.sizes && p.sizes.length > 0;
                        return (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-start gap-3">
                              <img
                                src={getImageUrl(displayImg)}
                                alt={p.name}
                                className="w-14 h-14 object-cover rounded flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{p.name}</p>
                                  {p.is_customizable && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                                      <PenTool className="h-2.5 w-2.5" />Customisable
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Qty: {item.quantity} × {formatCurrency(p.price)}
                                </p>

                                {/* Color Picker */}
                                {hasColors && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">
                                      Color: {v.colorName ? <span className="font-medium text-gray-700">{v.colorName}</span> : <span className="text-red-500">required</span>}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {p.colors!.filter(c => c.is_active).map(color => (
                                        <button
                                          key={color.id}
                                          type="button"
                                          onClick={() => setVariant(p.id, { colorId: color.id, colorName: color.color_name, colorCode: color.color_code, colorImage: color.image_url })}
                                          className={`w-6 h-6 rounded-full border-2 transition-all ${v.colorId === color.id ? 'border-premium-gold scale-110 shadow' : 'border-gray-300 hover:border-gray-400'}`}
                                          style={{ backgroundColor: color.color_code || '#ccc' }}
                                          title={color.color_name}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Size Picker */}
                                {hasSizes && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">
                                      Size: {v.sizeName ? <span className="font-medium text-gray-700">{v.sizeName}</span> : <span className="text-red-500">required</span>}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {p.sizes!.filter(s => s.is_active).map(size => (
                                        <button
                                          key={size.id}
                                          type="button"
                                          onClick={() => setVariant(p.id, { sizeId: size.id, sizeName: size.size_name, sizeCode: size.size_code })}
                                          className={`px-2 py-0.5 text-xs border rounded transition-all ${v.sizeId === size.id ? 'border-premium-gold bg-premium-gold/10 text-premium-gold font-semibold' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                                        >
                                          {size.size_code || size.size_name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <p className="font-semibold text-sm flex-shrink-0">
                                {formatCurrency(p.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customisation notice */}
                  {customizableItems.length > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-purple-700">
                        This combo includes <strong>{customizableItems.length}</strong> customisable{' '}
                        {customizableItems.length === 1 ? 'item' : 'items'}. You will be asked to personalise{' '}
                        {customizableItems.length === 1 ? 'it' : 'each one'} before adding to cart.
                      </p>
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Products MRP:</span>
                      <span className={finalPrice !== originalPrice ? 'line-through text-gray-400 text-sm' : 'text-gray-700 text-sm'}>
                        {formatCurrency(originalPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Combo Price:</span>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-premium-gold">{formatCurrency(finalPrice)}</span>
                        {savings > 0 && (
                          <p className="text-sm text-green-600 font-medium">
                            You save {formatCurrency(savings)} ({savingsPercentage}% off)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Readiness checklist */}
                  {comboProducts.some(item => {
                    const p = item.product;
                    if (!p) return false;
                    const v = selectedVariants.get(p.id) || {};
                    return (p.has_colors && p.colors && p.colors.length > 0 && !v.colorId)
                        || (p.has_sizes && p.sizes && p.sizes.length > 0 && !v.sizeId);
                  }) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-700 mb-2">⚠️ Please select options for:</p>
                      <ul className="space-y-1">
                        {comboProducts.map(item => {
                          const p = item.product;
                          if (!p) return null;
                          const v = selectedVariants.get(p.id) || {};
                          const needsColor = p.has_colors && p.colors && p.colors.length > 0 && !v.colorId;
                          const needsSize = p.has_sizes && p.sizes && p.sizes.length > 0 && !v.sizeId;
                          if (!needsColor && !needsSize) return null;
                          return (
                            <li key={p.id} className="text-xs text-amber-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                              <strong>{p.name}</strong>
                              {needsColor && ' — color required'}
                              {needsColor && needsSize && ','}
                              {needsSize && ' size required'}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 py-4 bg-premium-gold text-white rounded-xl hover:bg-premium-burgundy transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {customizableItems.length > 0 ? 'Personalise & Add to Cart' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Step-through customisation modal */}
      {currentCustomizableItem && currentProduct && (
        <ProductCustomizationModal
          product={currentProduct}
          selectedImageUrl={getCurrentColorImage()}
          onClose={handleCustomizationClose}
          onCustomizeComplete={handleCustomizationComplete}
        />
      )}
    </>
  );
};

export default ComboDetailsModal;