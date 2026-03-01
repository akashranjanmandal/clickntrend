import React, { useState, useEffect } from 'react';
import { X, Plus, Camera, Upload, Users, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../config';
import MultiImageUpload from './MultiImageUpload';

interface ProductUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ProductUpload: React.FC<ProductUploadProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<{ url: string; is_primary: boolean }[]>([]);
  const [previewCount, setPreviewCount] = useState(5);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    gender: 'unisex',
    price: '',
    original_price: '',
    discount_percentage: '',
    sku: `SKU-${Date.now().toString().slice(-8)}`,
    stock_quantity: '10',
    is_customizable: false,
    customization_price: '0',
    max_customization_characters: '50',
    social_proof_enabled: true,
    social_proof_text: '🔺{count} People are viewing this right now',
    social_proof_initial_count: '5',
    social_proof_end_count: '15',
  });

  // Auto-calculate discount percentage when price or original price changes
  useEffect(() => {
    const price = parseFloat(formData.price) || 0;
    const originalPrice = parseFloat(formData.original_price) || 0;
    
    if (originalPrice > 0 && price > 0 && originalPrice > price) {
      const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      setFormData(prev => ({ ...prev, discount_percentage: discount.toString() }));
    } else if (originalPrice === 0 || price === 0 || originalPrice <= price) {
      setFormData(prev => ({ ...prev, discount_percentage: '' }));
    }
  }, [formData.price, formData.original_price]);

  // Auto-calculate price when discount percentage or original price changes
  useEffect(() => {
    const originalPrice = parseFloat(formData.original_price) || 0;
    const discountPercent = parseFloat(formData.discount_percentage) || 0;
    
    if (originalPrice > 0 && discountPercent > 0 && discountPercent <= 100) {
      const calculatedPrice = originalPrice - (originalPrice * discountPercent / 100);
      setFormData(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
    }
  }, [formData.original_price, formData.discount_percentage]);

  // Update preview count when initial/end counts change
  useEffect(() => {
    const initial = parseInt(formData.social_proof_initial_count) || 5;
    const end = parseInt(formData.social_proof_end_count) || 15;
    setPreviewCount(Math.floor(Math.random() * (end - initial + 1)) + initial);
  }, [formData.social_proof_initial_count, formData.social_proof_end_count]);

  const getRandomPreviewCount = () => {
    const initial = parseInt(formData.social_proof_initial_count) || 5;
    const end = parseInt(formData.social_proof_end_count) || 15;
    return Math.floor(Math.random() * (end - initial + 1)) + initial;
  };

  const refreshPreview = () => {
    setPreviewCount(getRandomPreviewCount());
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiFetch('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setCategories(data.map((c: any) => c.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImagesUploaded = (images: { url: string; is_primary: boolean }[]) => {
    setProductImages(images);
  };

  // Calculate savings
  const savings = parseFloat(formData.original_price) && parseFloat(formData.price) 
    ? (parseFloat(formData.original_price) - parseFloat(formData.price)).toFixed(2)
    : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (productImages.length === 0) {
      alert('Please upload at least one product image');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      
      // Get primary image URL
      const primaryImage = productImages.find(img => img.is_primary) || productImages[0];
      
      // Prepare data for insert
      const productData: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory || null,
        gender: formData.gender,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        sku: formData.sku,
        image_url: primaryImage.url,
        is_active: true,
        social_proof_enabled: formData.social_proof_enabled,
        social_proof_text: formData.social_proof_text,
        social_proof_initial_count: parseInt(formData.social_proof_initial_count),
        social_proof_end_count: parseInt(formData.social_proof_end_count),
      };

      // Only add optional fields if they have values
      if (formData.original_price) {
        productData.original_price = parseFloat(formData.original_price);
      }
      
      if (formData.discount_percentage) {
        productData.discount_percentage = parseInt(formData.discount_percentage);
      }
      
      // Add customization fields
      productData.is_customizable = formData.is_customizable;
      
      if (formData.is_customizable) {
        productData.customization_price = parseFloat(formData.customization_price);
        productData.max_customization_characters = parseInt(formData.max_customization_characters);
      }
      
      // Add additional_images as an array
      const additionalImageUrls = productImages
        .filter(img => !img.is_primary)
        .map(img => img.url);
      
      if (additionalImageUrls.length > 0) {
        productData.additional_images = additionalImageUrls;
      }

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create product' }));
        throw new Error(errorData.message || errorData.error || 'Failed to create product');
      }

      alert('Product added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Create error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-semibold">Add New Product</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Multi Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-3">Product Images * (Max 5)</label>
              <MultiImageUpload
                onImagesUploaded={handleImagesUploaded}
                maxImages={5}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Subcategory Field */}
              <div>
                <label className="block text-sm font-medium mb-2">Subcategory (Optional)</label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="e.g., Luxury, Classic, Premium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                >
                  <option value="unisex">Unisex</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="kids">Kids</option>
                </select>
              </div>

              {/* SKU Field - New */}
              <div>
                <label className="block text-sm font-medium mb-2">SKU (Stock Keeping Unit) *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  required
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="SKU-12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price (₹) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="2999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Original Price (₹)</label>
                <input
                  type="number"
                  value={formData.original_price}
                  onChange={(e) => setFormData({...formData, original_price: e.target.value})}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="3999"
                />
              </div>

              {/* Discount % - Auto-calculated */}
              <div>
                <label className="block text-sm font-medium mb-2">Discount %</label>
                <input
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({...formData, discount_percentage: e.target.value})}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none bg-gray-50"
                  placeholder="Auto-calculated"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from price difference
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Stock Quantity *</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  required
                  min="0"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="10"
                />
              </div>
            </div>

            {/* Price Summary Card */}
            {(parseFloat(formData.original_price) > 0 && parseFloat(formData.price) > 0) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Price Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Original:</span>
                    <span className="ml-2 font-semibold">₹{parseFloat(formData.original_price).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-green-600">Selling:</span>
                    <span className="ml-2 font-semibold">₹{parseFloat(formData.price).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-green-600">You Save:</span>
                    <span className="ml-2 font-semibold text-premium-burgundy">
                      ₹{parseFloat(savings).toLocaleString()} ({formData.discount_percentage || 0}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Social Proof Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-premium-gold" />
                Marketing & Social Proof
              </h3>
              
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="social_proof_enabled"
                  checked={formData.social_proof_enabled}
                  onChange={(e) => setFormData({...formData, social_proof_enabled: e.target.checked})}
                  className="rounded text-premium-gold"
                />
                <label htmlFor="social_proof_enabled" className="font-medium">
                  Enable Social Proof ("X people are viewing/buying")
                </label>
              </div>

              {formData.social_proof_enabled && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-2">
                      Social Proof Text
                    </label>
                    <input
                      type="text"
                      value={formData.social_proof_text}
                      onChange={(e) => setFormData({...formData, social_proof_text: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="🔺{count} People are viewing this right now"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use {'{count}'} as placeholder for the dynamic number
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Initial Count
                    </label>
                    <input
                      type="number"
                      value={formData.social_proof_initial_count}
                      onChange={(e) => setFormData({...formData, social_proof_initial_count: e.target.value})}
                      min="1"
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Starting number</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      End Count
                    </label>
                    <input
                      type="number"
                      value={formData.social_proof_end_count}
                      onChange={(e) => setFormData({...formData, social_proof_end_count: e.target.value})}
                      min="1"
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="15"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum number</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Live Preview
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border rounded-lg text-sm font-medium text-premium-gold">
                      {formData.social_proof_text.replace('{count}', previewCount.toString())}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Count varies between {formData.social_proof_initial_count} and {formData.social_proof_end_count}
                    </p>
                    <button
                      type="button"
                      onClick={refreshPreview}
                      className="mt-2 text-xs text-premium-gold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh preview
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Customization Options */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4">Customization Options</h3>
              
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="is_customizable"
                  checked={formData.is_customizable}
                  onChange={(e) => setFormData({...formData, is_customizable: e.target.checked})}
                  className="rounded text-premium-gold"
                />
                <label htmlFor="is_customizable" className="font-medium">
                  This product can be customized (text/images)
                </label>
              </div>

              {formData.is_customizable && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Customization Price (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.customization_price}
                      onChange={(e) => setFormData({...formData, customization_price: e.target.value})}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="299"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Max Characters
                    </label>
                    <input
                      type="number"
                      value={formData.max_customization_characters}
                      onChange={(e) => setFormData({...formData, max_customization_characters: e.target.value})}
                      min="1"
                      max="200"
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="50"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                rows={3}
                className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                placeholder="Enter product description..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Add Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductUpload;