import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Camera, RefreshCw } from 'lucide-react';
import { Product } from '../../types';
import { apiFetch } from '../../config';
import MultiImageUpload from './MultiImageUpload';

interface EditProductProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

const EditProduct: React.FC<EditProductProps> = ({ product, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; is_primary: boolean }[]>([]);
  
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price.toString(),
    original_price: product.original_price?.toString() || '',
    discount_percentage: product.discount_percentage?.toString() || '',
    stock_quantity: product.stock_quantity.toString(),
    is_active: product.is_active,
    is_customizable: product.is_customizable || false,
    customization_price: product.customization_price?.toString() || '0',
    max_customization_characters: product.max_customization_characters?.toString() || '50',
  });

  useEffect(() => {
    fetchCategories();
    // Initialize uploaded images with existing product image
    if (product.image_url) {
      setUploadedImages([{
        url: product.image_url,
        is_primary: true
      }]);
    }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImagesUploaded = (images: { url: string; is_primary: boolean }[]) => {
    setUploadedImages(images);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      
      // Get primary image URL
      const primaryImage = uploadedImages.find(img => img.is_primary) || uploadedImages[0];
      if (!primaryImage) {
        throw new Error('Please upload at least one image');
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        image_url: primaryImage.url,
        additional_images: uploadedImages.map(img => img.url),
        stock_quantity: parseInt(formData.stock_quantity),
        is_customizable: formData.is_customizable,
        customization_price: formData.is_customizable ? parseFloat(formData.customization_price) : 0,
        max_customization_characters: formData.is_customizable ? parseInt(formData.max_customization_characters) : 50,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) throw new Error('Failed to update product');

      alert('Product updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
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
            <h2 className="text-2xl font-serif font-semibold">Edit Product</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Multi Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Product Images * (Max 5, first image will be primary)
              </label>
              <MultiImageUpload 
                onImagesUploaded={handleImagesUploaded}
                maxImages={5}
              />
              {uploadedImages.length === 0 && (
                <p className="text-sm text-red-500 mt-2">
                  * At least one image is required
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price (₹) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Original Price (₹)</label>
                <input
                  type="number"
                  name="original_price"
                  value={formData.original_price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Discount %</label>
                <input
                  type="number"
                  name="discount_percentage"
                  value={formData.discount_percentage}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Stock Quantity *</label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-premium-gold rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Product is active and visible to customers
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
              />
            </div>

            {/* Customization Options */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Customization Options</h3>
              
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  name="is_customizable"
                  id="edit_is_customizable"
                  checked={formData.is_customizable}
                  onChange={handleInputChange}
                  className="rounded text-premium-gold"
                />
                <label htmlFor="edit_is_customizable" className="font-medium">
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
                      name="customization_price"
                      value={formData.customization_price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="299"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Extra charge for customization
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Max Characters
                    </label>
                    <input
                      type="number"
                      name="max_customization_characters"
                      value={formData.max_customization_characters}
                      onChange={handleInputChange}
                      min="1"
                      max="200"
                      className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum text length for customization
                    </p>
                  </div>
                </div>
              )}
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
                disabled={loading || uploadedImages.length === 0}
                className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Changes
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

export default EditProduct;