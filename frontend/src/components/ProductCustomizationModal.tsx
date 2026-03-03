import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Type, Image as ImageIcon, Minus, Plus, Download, Eye, Trash2, FileText } from 'lucide-react';
import { Product, CustomizationData } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { publicFetch } from '../utils/apiFetch';
import toast from 'react-hot-toast';

interface ProductCustomizationModalProps {
  product: Product;
  onClose: () => void;
  onCustomizeComplete?: (customization: CustomizationData) => void; // New prop for combo builder
}

const ProductCustomizationModal: React.FC<ProductCustomizationModalProps> = ({ 
  product, 
  onClose,
  onCustomizeComplete 
}) => {
  const { addItem } = useCart();
  const [textLines, setTextLines] = useState<string[]>(['']);
  const [customImages, setCustomImages] = useState<{ file: File | null; preview: string | null; url?: string; uploading?: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const maxImages = product.max_customization_images || 10;
  const maxLines = product.max_customization_lines || 10;
  const maxChars = product.max_customization_characters || 50;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Handle multiple file selection
    const fileArray = Array.from(files);
    
    // Check total images limit
    if (customImages.length + fileArray.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed. You can upload ${maxImages - customImages.length} more.`);
      return;
    }

    fileArray.forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} size should be less than 10MB`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setCustomImages(prev => [...prev, { file, preview, url: undefined, uploading: false }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const updated = customImages.filter((_, i) => i !== index);
    setCustomImages(updated);
  };

  const addTextLine = () => {
    if (textLines.length < maxLines) {
      setTextLines([...textLines, '']);
    } else {
      toast.error(`Maximum ${maxLines} text lines allowed`);
    }
  };

  const removeTextLine = (index: number) => {
    if (textLines.length > 1) {
      const updated = textLines.filter((_, i) => i !== index);
      setTextLines(updated);
    } else {
      setTextLines(['']); // Keep at least one empty line
    }
  };

  const updateTextLine = (index: number, value: string) => {
    const updated = [...textLines];
    updated[index] = value;
    setTextLines(updated);
  };

  const uploadCustomImages = async (): Promise<string[]> => {
    const imagesToUpload = customImages.filter(img => img.file && !img.url);
    
    if (imagesToUpload.length === 0) {
      // Return existing URLs for already uploaded images
      return customImages
        .filter(img => img.url)
        .map(img => img.url as string);
    }

    setUploading(true);
    
    // Mark images as uploading
    setCustomImages(prev => prev.map(img => 
      img.file && !img.url ? { ...img, uploading: true } : img
    ));

    const uploadedUrls: string[] = [];

    try {
      // Upload images one by one
      for (let i = 0; i < imagesToUpload.length; i++) {
        const image = imagesToUpload[i];
        if (!image.file) continue;

        const formData = new FormData();
        formData.append('image', image.file);
        formData.append('product_id', product.id);
        formData.append('index', i.toString());

        console.log(`Uploading image ${i + 1}/${imagesToUpload.length}:`, {
          name: image.file.name,
          type: image.file.type,
          size: image.file.size
        });

        const endpoint = '/api/upload/customization';
        const response = await publicFetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {}
        });
        
        console.log('Upload successful:', response);
        
        const imageUrl = response.image_url || response.url;
        if (!imageUrl) {
          throw new Error('Server returned invalid response format');
        }
        
        uploadedUrls.push(imageUrl);
        
        // Update the image object with the URL
        setCustomImages(prev => {
          const updated = [...prev];
          const imgIndex = updated.findIndex(img => img.file === image.file);
          if (imgIndex !== -1) {
            updated[imgIndex] = { ...updated[imgIndex], url: imageUrl, uploading: false };
          }
          return updated;
        });
      }
      
      // Include previously uploaded URLs
      const existingUrls = customImages
        .filter(img => img.url && !imagesToUpload.includes(img))
        .map(img => img.url as string);
      
      return [...existingUrls, ...uploadedUrls];
    } catch (error: any) {
      console.error('Error uploading image:', error);
      
      // Reset uploading state on error
      setCustomImages(prev => prev.map(img => ({ ...img, uploading: false })));
      
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
      
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Filter out empty text lines
    const nonEmptyTextLines = textLines.filter(line => line.trim() !== '');
    
    let imageUrls: string[] = [];
    if (customImages.length > 0) {
      toast.loading(`Uploading ${customImages.filter(img => !img.url).length} images...`, { id: 'upload' });
      imageUrls = await uploadCustomImages();
      toast.dismiss('upload');
      
      if (imageUrls.length !== customImages.length) {
        toast.error('Some images failed to upload. Please try again.');
        return; // Stop if some uploads failed
      }
    }

    const customization: CustomizationData = {
      text_lines: nonEmptyTextLines.length > 0 ? nonEmptyTextLines : undefined,
      image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      preview_urls: customImages.map(img => img.preview).filter(Boolean) as string[],
      image_paths: imageUrls
    };

    // If onCustomizeComplete is provided (for combo builder), call it and close
    if (onCustomizeComplete) {
      onCustomizeComplete(customization);
      toast.success('Customization saved!');
      onClose();
    } else {
      // Otherwise, add to cart directly (regular flow)
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
          customization: customization
        });
      }

      toast.success(`Added ${quantity} customized item${quantity > 1 ? 's' : ''} to cart!`);
      onClose();
    }
  };

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
          className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-10">
            <h2 className="text-lg sm:text-xl font-serif font-bold">Customize Your Gift</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left side - Preview */}
              <div className="lg:w-1/2">
                <h3 className="font-medium text-sm mb-3">Preview</h3>
                <div className="space-y-4">
                  {/* Main product image */}
                  <div className="relative border rounded-lg overflow-hidden bg-gray-50 aspect-square">
                    <img
                      src={product.image_url}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Text overlays */}
                    {textLines.some(line => line.trim() !== '') && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 p-6 space-y-2">
                        {textLines.map((line, idx) => (
                          line.trim() !== '' && (
                            <p 
                              key={idx} 
                              className="text-white text-sm sm:text-base font-bold text-center break-words max-w-full"
                              style={{
                                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                              }}
                            >
                              {line}
                            </p>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Image preview thumbnails */}
                  {customImages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center justify-between">
                        <span>Custom Images ({customImages.length}/{maxImages})</span>
                        {customImages.filter(img => img.uploading).length > 0 && (
                          <span className="text-xs text-blue-600">
                            Uploading {customImages.filter(img => img.uploading).length}...
                          </span>
                        )}
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                        {customImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-square border rounded-lg overflow-hidden group">
                            <img
                              src={img.preview || ''}
                              alt={`Custom ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {img.uploading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                              </div>
                            )}
                            <button
                              onClick={() => removeImage(idx)}
                              disabled={img.uploading}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Customization options */}
              <div className="lg:w-1/2 space-y-6">
                {/* Custom Text Lines */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-premium-gold" />
                      <span>Add Custom Text <span className="text-gray-500">({textLines.length}/{maxLines})</span></span>
                    </label>
                    {textLines.length < maxLines && (
                      <button
                        onClick={addTextLine}
                        className="text-xs bg-premium-gold text-white px-3 py-1 rounded-full hover:bg-premium-burgundy flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Line
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {textLines.map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">Line {idx + 1}</span>
                            <span className="text-xs text-gray-400">{line.length}/{maxChars}</span>
                          </div>
                          <input
                            type="text"
                            value={line}
                            onChange={(e) => updateTextLine(idx, e.target.value)}
                            maxLength={maxChars}
                            placeholder={`Enter text (max ${maxChars} chars)`}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:border-premium-gold focus:outline-none"
                          />
                        </div>
                        {textLines.length > 1 && (
                          <button
                            onClick={() => removeTextLine(idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-6"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Images */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-premium-gold" />
                      <span>Add Custom Images <span className="text-gray-500">({customImages.length}/{maxImages})</span></span>
                    </label>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {customImages.map((img, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 border">
                          <img
                            src={img.preview || ''}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{img.file?.name || `Image ${idx + 1}`}</p>
                          {img.file && (
                            <p className="text-xs text-gray-500">
                              {(img.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                          {img.url && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                              Uploaded
                            </p>
                          )}
                          {img.uploading && (
                            <p className="text-xs text-blue-600 flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                              Uploading...
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {img.url && (
                            <>
                              <a
                                href={img.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-gray-100 rounded"
                                title="Download"
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </a>
                              <a
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-gray-100 rounded"
                                title="View"
                              >
                                <Eye className="h-4 w-4 text-gray-600" />
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => removeImage(idx)}
                            disabled={img.uploading}
                            className="p-1.5 hover:bg-red-100 text-red-500 rounded disabled:opacity-50"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {customImages.length < maxImages && (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleImageUpload}
                          multiple
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-premium-gold transition-colors">
                          <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Click or drag to upload images</p>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG up to 10MB each • Max {maxImages} images
                          </p>
                          <p className="text-xs text-premium-gold mt-2">
                            You can select multiple files at once
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-600">Base Price:</span>
                    <span className="font-medium">₹{product.price.toLocaleString()}</span>
                  </div>
                  {(product.customization_price || 0) > 0 && (
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="text-gray-600">Customization Fee:</span>
                      <span className="font-medium">+₹{product.customization_price?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-base font-bold pt-2 border-t">
                    <span>Total per item:</span>
                    <span className="text-premium-gold">
                      ₹{(product.price + (product.customization_price || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quantity - Only show if NOT in combo mode */}
                {!onCustomizeComplete && (
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm font-medium">Quantity:</span>
                    <div className="flex items-center border rounded-lg bg-white">
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
                )}

                {/* Action Button */}
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="w-full py-4 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading {customImages.filter(img => !img.url).length} images...
                    </span>
                  ) : onCustomizeComplete ? (
                    `Save Customization • ₹${(product.price + (product.customization_price || 0)).toLocaleString()}`
                  ) : (
                    `Add to Cart • ₹${((product.price + (product.customization_price || 0)) * quantity).toLocaleString()}`
                  )}
                </button>

                {/* Note for combo mode */}
                {onCustomizeComplete && (
                  <p className="text-xs text-center text-gray-500 mt-2">
                    This customization will be saved to your combo
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProductCustomizationModal;