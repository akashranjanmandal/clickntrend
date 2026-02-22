import React, { useState, useEffect } from 'react';
import { X, Save, Camera, RefreshCw } from 'lucide-react';
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
  const [productImages, setProductImages] = useState<{ url: string; is_primary: boolean }[]>([
    { url: product.image_url, is_primary: true }
  ]);
  
  // Parse additional_images if they exist
  useEffect(() => {
    if (product.additional_images && product.additional_images.length > 0) {
      const additional = product.additional_images.map(url => ({
        url,
        is_primary: false
      }));
      setProductImages([{ url: product.image_url, is_primary: true }, ...additional]);
    }
  }, [product]);

  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price.toString(),
    original_price: product.original_price?.toString() || '',
    discount_percentage: product.discount_percentage?.toString() || '',
    stock_quantity: product.stock_quantity.toString(),
    is_customizable: product.is_customizable || false,
    customization_price: product.customization_price?.toString() || '0',
    max_customization_characters: product.max_customization_characters?.toString() || '50',
    is_active: product.is_active,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      
      // Get primary image URL
      const primaryImage = productImages.find(img => img.is_primary) || productImages[0];
      
      // Prepare data for update - ONLY include fields that exist in the database
      const productData: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: primaryImage.url,
        updated_at: new Date().toISOString()
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
      
      productData.is_active = formData.is_active;

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update product' }));
        throw new Error(errorData.message || errorData.error || 'Failed to update product');
      }

      alert('Product updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Update error:', error);
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
              <label className="block text-sm font-medium mb-3">Product Images (Max 5)</label>
              <MultiImageUpload
                onImagesUploaded={handleImagesUploaded}
                maxImages={5}
                initialImages={productImages}
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Discount %</label>
                <input
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({...formData, discount_percentage: e.target.value})}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                />
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
                />
              </div>
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

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="h-4 w-4 text-premium-gold rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Product is active and visible to customers
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
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