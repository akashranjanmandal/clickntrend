import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Camera, RefreshCw } from 'lucide-react';
import { Product } from '../../types';
import { apiFetch } from '../../config';

interface EditProductProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

const EditProduct: React.FC<EditProductProps> = ({ product, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(product.image_url);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price.toString(),
    original_price: product.original_price?.toString() || '',
    discount_percentage: product.discount_percentage?.toString() || '',
    stock_quantity: product.stock_quantity.toString(),
    is_active: product.is_active,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiFetch('/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setCategories(data.map((c: any) => c.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return product.image_url;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      return data.image_url;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      
      // Upload new image if changed
      const imageUrl = await uploadImage();

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        image_url: imageUrl || product.image_url,
        stock_quantity: parseInt(formData.stock_quantity),
        is_active: formData.is_active,
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
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-semibold">Edit Product</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">Product Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-premium-gold transition-colors">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="mx-auto max-h-48 rounded-lg"
                    />
                    <div className="absolute bottom-2 right-2 flex space-x-2">
                      <label className="p-2 bg-white shadow-md rounded-full hover:bg-gray-50 cursor-pointer">
                        <Camera className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(product.image_url);
                          setImageFile(null);
                        }}
                        className="p-2 bg-white shadow-md rounded-full hover:bg-gray-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Click to upload new image</p>
                    <p className="text-sm text-gray-500 mb-4">JPEG, PNG, WebP (Max 5MB)</p>
                    <label className="inline-flex items-center px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                {uploadingImage && (
                  <div className="mt-2 text-sm text-blue-600">
                    Uploading image...
                  </div>
                )}
              </div>
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