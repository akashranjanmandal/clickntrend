import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Type, Image as ImageIcon, Minus, Plus } from 'lucide-react';
import { Product, CustomizationData } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { publicFetch } from '../utils/apiFetch'; // Import publicFetch instead of apiFetch
import toast from 'react-hot-toast';

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
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
      
      setCustomImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCustomImage = async (): Promise<string | null> => {
    if (!customImageFile) return null;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', customImageFile);
    formData.append('product_id', product.id);

    // Log FormData contents for debugging
    console.log('Uploading file:', {
      name: customImageFile.name,
      type: customImageFile.type,
      size: customImageFile.size,
      product_id: product.id
    });

    try {
      // Use publicFetch instead of apiFetch
      const endpoint = '/api/upload/customization';
      
      console.log(`Trying endpoint: ${endpoint}`);
      const response = await publicFetch(endpoint, {  // Changed to publicFetch
        method: 'POST',
        body: formData,
        headers: {} // Let browser set content-type for FormData
      });
      
      console.log('Upload successful:', response);
      
      if (!response.image_url && !response.url) {
        console.error('Unexpected response format:', response);
        throw new Error('Server returned invalid response format');
      }
      
      return response.image_url || response.url;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      
      // Show more specific error message
      if (error.message?.includes('400')) {
        toast.error('Server rejected the upload. Please check file format.');
      } else if (error.message?.includes('413')) {
        toast.error('File too large. Please upload a smaller image.');
      } else if (error.message?.includes('429')) {
        toast.error('Too many uploads. Please try again later.');
      } else if (error.message?.includes('500')) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(error.message || 'Failed to upload image');
      }
      
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAddToCart = async () => {
    let imageUrl = null;
    if (customImageFile) {
      toast.loading('Uploading image...', { id: 'upload' });
      imageUrl = await uploadCustomImage();
      toast.dismiss('upload');
      
      if (!imageUrl) {
        return; // Stop if upload failed
      }
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

    toast.success(`Added ${quantity} customized item${quantity > 1 ? 's' : ''} to cart!`);
    onClose();
  };

  // Update preview when text changes
  useEffect(() => {
    if (customImage) {
      setPreviewUrl(customImage);
    }
  }, [customText, customImage]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70"
        />

        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'tween' }}
          className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-10">
            <h2 className="text-lg sm:text-xl font-serif font-bold">Customize Your Gift</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Left side - Preview */}
              <div className="sm:w-1/2">
                <h3 className="font-medium text-sm mb-2">Preview</h3>
                <div className="relative border rounded-lg overflow-hidden bg-gray-50 aspect-square">
                  <img
                    src={previewUrl || product.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = product.image_url;
                    }}
                  />
                  {customText && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-4">
                      <p className="text-white text-sm sm:text-base font-bold text-center break-words">
                        {customText}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Customization options */}
              <div className="sm:w-1/2 space-y-4">
                {/* Custom Text */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Type className="h-4 w-4" />
                    Add Custom Text
                  </label>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    maxLength={product.max_customization_characters || 50}
                    placeholder="Enter your message..."
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:border-premium-gold focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max {product.max_customization_characters || 50} characters
                  </p>
                </div>

                {/* Custom Image */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" />
                    Add Custom Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-premium-gold transition-colors">
                    {customImage ? (
                      <div className="relative">
                        <img
                          src={customImage}
                          alt="Custom"
                          className="max-h-24 mx-auto rounded"
                        />
                        <button
                          onClick={() => {
                            setCustomImage(null);
                            setCustomImageFile(null);
                            setPreviewUrl(null);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-600">Click to upload</p>
                        <p className="text-[10px] text-gray-500">PNG, JPG up to 2MB</p>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center mb-1.5 text-sm">
                    <span className="text-gray-600">Base Price:</span>
                    <span className="font-medium">₹{product.price.toLocaleString()}</span>
                  </div>
                  {(product.customization_price || 0) > 0 && (
                    <div className="flex justify-between items-center mb-1.5 text-sm">
                      <span className="text-gray-600">Customization Fee:</span>
                      <span className="font-medium">+₹{product.customization_price?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-base font-bold pt-1.5 border-t">
                    <span>Total per item:</span>
                    <span className="text-premium-gold">
                      ₹{(product.price + (product.customization_price || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quantity:</span>
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1.5 hover:bg-gray-100 text-sm"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-4 py-1.5 text-sm border-x min-w-[40px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1.5 hover:bg-gray-100 text-sm"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={uploading}
                  className="w-full py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-medium text-sm disabled:opacity-50 mt-4"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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