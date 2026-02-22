import React, { useState } from 'react';
import { X, Upload, Camera, Type, Image as ImageIcon } from 'lucide-react';
import { Product, CustomizationData } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../config';

interface ProductCustomizationModalProps {
  product: Product;
  onClose: () => void;
}

const ProductCustomizationModal: React.FC<ProductCustomizationModalProps> = ({ product, onClose }) => {
  const { addItem } = useCart();
  const [customText, setCustomText] = useState('');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      setCustomImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        // Create preview with text overlay
        createPreview(reader.result as string, customText);
      };
      reader.readAsDataURL(file);
    }
  };

  const createPreview = (imageData: string, text: string) => {
    // Simple preview - in real app, you'd use canvas to overlay text
    setPreviewUrl(imageData);
  };

  const uploadCustomImage = async (): Promise<string | null> => {
    if (!customImageFile) return null;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', customImageFile);
    formData.append('product_id', product.id);

    try {
      const response = await apiFetch('/api/upload/customization', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set content-type for FormData
      });
      return response.image_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAddToCart = async () => {
    let imageUrl = null;
    if (customImageFile) {
      imageUrl = await uploadCustomImage();
    }

    const customization: CustomizationData = {
      text: customText || undefined,
      image_url: imageUrl || undefined,
      preview_url: previewUrl || undefined
    };

    const finalPrice = product.price + (product.customization_price || 0);

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: `${product.id}-${Date.now()}-${i}`,
        name: `${product.name}${customText ? ` - "${customText}"` : ''}`,
        price: finalPrice,
        quantity: 1,
        image_url: product.image_url,
        type: 'product',
        category: product.category,
        customization: customization
      });
    }

    onClose();
  };

  // Update preview when text changes
  React.useEffect(() => {
    if (customImage) {
      createPreview(customImage, customText);
    }
  }, [customText]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-serif font-bold">Customize Your Gift</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left side - Preview */}
              <div>
                <h3 className="font-medium mb-3">Preview</h3>
                <div className="relative border rounded-lg overflow-hidden bg-gray-50 aspect-square">
                  <img
                    src={previewUrl || product.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {customText && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <p className="text-white text-lg font-bold text-center px-4 break-words">
                        {customText}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Customization options */}
              <div className="space-y-4">
                {/* Custom Text */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Add Custom Text
                  </label>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    maxLength={product.max_customization_characters || 50}
                    placeholder="Enter your message..."
                    className="w-full px-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max {product.max_customization_characters || 50} characters
                  </p>
                </div>

                {/* Custom Image */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Add Custom Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-premium-gold transition-colors">
                    {customImage ? (
                      <div className="relative">
                        <img
                          src={customImage}
                          alt="Custom"
                          className="max-h-32 mx-auto rounded"
                        />
                        <button
                          onClick={() => {
                            setCustomImage(null);
                            setCustomImageFile(null);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-0 right-0 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload image</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Base Price:</span>
                    <span className="font-medium">₹{product.price.toLocaleString()}</span>
                  </div>
                  {(product.customization_price || 0) > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Customization Fee:</span>
                      <span className="font-medium">+₹{product.customization_price?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total per item:</span>
                    <span className="text-premium-gold">
                      ₹{(product.price + (product.customization_price || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between">
                  <span className="font-medium">Quantity:</span>
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 border-x">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={uploading}
                  className="w-full py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-medium mt-4 disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading...
                    </span>
                  ) : (
                    `Add to Cart • ₹${((product.price + (product.customization_price || 0)) * quantity).toLocaleString()}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProductCustomizationModal;