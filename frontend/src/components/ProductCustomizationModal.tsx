import React, { useState, useEffect } from 'react';
import { createPortal } from "react-dom";
import {
  X, Upload, Camera, Type, Image as ImageIcon,
  Minus, Plus, Download, Eye, Trash2, FileText, AlertCircle
} from 'lucide-react';
import { Product, CustomizationData } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { publicFetch } from '../utils/apiFetch';
import toast from 'react-hot-toast';

interface ProductCustomizationModalProps {
  product: Product;
  onClose: () => void;
  onCustomizeComplete?: (customization: CustomizationData) => void;
}

const ProductCustomizationModal: React.FC<ProductCustomizationModalProps> = ({
  product,
  onClose,
  onCustomizeComplete
}) => {

  const { addItem } = useCart();

  const [textLines, setTextLines] = useState<string[]>(() =>
    Array(product.max_customization_lines || 1).fill('')
  );

  const [customImages, setCustomImages] = useState<
    { file: File | null; preview: string | null; url?: string; uploading?: boolean }[]
  >([]);

  const [uploading, setUploading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const maxImages = product.max_customization_images || 10;
  const maxLines = product.max_customization_lines || 10;
  const maxChars = product.max_customization_characters || 50;

  const isCustomizationRequired = product.is_customizable === true;

  /* Lock body scroll when modal opens */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const removeImage = (index: number) => {
    const updated = customImages.filter((_, i) => i !== index);
    setCustomImages(updated);
  };

  const updateTextLine = (index: number, value: string) => {
    const updated = [...textLines];
    updated[index] = value;
    setTextLines(updated);
  };

  const validateCustomization = () => {
    const errors: string[] = [];

    const hasText = textLines.some(line => line.trim() !== '');
    if (maxLines > 0 && !hasText) {
      errors.push('Please add at least one line of custom text');
    }

    if (maxImages > 0 && customImages.length === 0) {
      errors.push('Please upload at least one custom image');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const uploadCustomImages = async (): Promise<string[]> => {

    const imagesToUpload = customImages.filter(img => img.file && !img.url);

    if (imagesToUpload.length === 0) {
      return customImages
        .filter(img => img.url)
        .map(img => img.url as string);
    }

    setUploading(true);

    const uploadedUrls: string[] = [];

    try {

      for (let i = 0; i < imagesToUpload.length; i++) {

        const image = imagesToUpload[i];
        if (!image.file) continue;

        const formData = new FormData();
        formData.append('image', image.file);
        formData.append('product_id', product.id);

        const response = await publicFetch('/api/upload/customization', {
          method: 'POST',
          body: formData,
          headers: {}
        });

        const imageUrl = response.image_url || response.url;

        uploadedUrls.push(imageUrl);

      }

      return uploadedUrls;

    } catch (error: any) {

      toast.error('Image upload failed');
      return [];

    } finally {
      setUploading(false);
    }

  };

  const handleSubmit = async () => {

    if (isCustomizationRequired && !validateCustomization()) {
      toast.error('Please complete customization');
      return;
    }

    const text = textLines.filter(t => t.trim() !== '');

    let imageUrls: string[] = [];

    if (customImages.length > 0) {
      imageUrls = await uploadCustomImages();
    }

    const customization: CustomizationData = {
      text_lines: text.length > 0 ? text : undefined,
      image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      preview_urls: customImages.map(i => i.preview).filter(Boolean) as string[],
      image_paths: imageUrls
    };

    if (onCustomizeComplete) {

      onCustomizeComplete(customization);
      onClose();

    } else {

      const finalPrice = product.price + (product.customization_price || 0);

      for (let i = 0; i < quantity; i++) {
        addItem({
          id: `${product.id}-${Date.now()}-${i}`,
          name: product.name,
          price: finalPrice,
          quantity: 1,
          image_url: product.image_url,
          type: 'product',
          category: product.category,
          customization
        });
      }

      toast.success(`Added to cart`);
      onClose();
    }

  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const modalContent = (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Customize Your Gift</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* CONTENT */}
          <div className="p-6 space-y-6">
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <ul className="text-sm list-disc list-inside">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Product Info */}
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-medium text-lg">{product.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                <p className="text-premium-gold font-bold mt-2">
                  ${(product.price + (product.customization_price || 0)).toFixed(2)}
                </p>
              </div>
            </div>

            {/* TEXT INPUT */}
            {maxLines > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Custom Text {maxLines > 0 && `(Max ${maxLines} lines)`}
                </h4>
                <div className="space-y-3">
                  {textLines.map((line, i) => (
                    <div key={i}>
                      <input
                        value={line}
                        maxLength={maxChars}
                        onChange={(e) => updateTextLine(i, e.target.value)}
                        placeholder={`Line ${i + 1}`}
                        className="w-full border rounded-lg px-4 py-3 focus:border-premium-gold focus:outline-none"
                      />
                      {maxChars > 0 && (
                        <p className="text-xs text-gray-400 mt-1 text-right">
                          {line.length}/{maxChars}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IMAGE UPLOAD */}
            {maxImages > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Custom Images {maxImages > 0 && `(Max ${maxImages})`}
                </h4>
                {/* Add your image upload UI here */}
              </div>
            )}

            {/* QUANTITY */}
            {!onCustomizeComplete && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 border rounded-lg hover:bg-gray-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 border rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* BUTTON */}
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full py-4 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading...
                </span>
              ) : (
                `Add to Cart • $${((product.price + (product.customization_price || 0)) * quantity).toFixed(2)}`
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ProductCustomizationModal;