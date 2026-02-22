import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Search, Package, Trash2, Save, Upload, Camera } from 'lucide-react';
import { Product, Combo } from '../../types';
import { formatCurrency, getImageUrl } from '../../utils/helpers';
import { apiFetch } from '../../config';

interface ComboManagerProps {
  combo?: Combo | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ComboProduct extends Product {
  quantity: number;
}

const ComboManager: React.FC<ComboManagerProps> = ({ combo, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ComboProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [comboData, setComboData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    discount_price: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchProducts();
    if (combo) {
      loadComboForEdit();
    }
  }, [combo]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiFetch('/api/admin/products', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const loadComboForEdit = () => {
    if (!combo) return;
    
    setComboData({
      name: combo.name || '',
      description: combo.description || '',
      discount_percentage: combo.discount_percentage?.toString() || '',
      discount_price: combo.discount_price?.toString() || '',
      image_url: combo.image_url || '',
      is_active: combo.is_active !== undefined ? combo.is_active : true,
    });

    if (combo.image_url) {
      setImagePreview(combo.image_url);
    }

    // Load selected products
    if (combo.combo_products && combo.combo_products.length > 0) {
      const productsWithQuantity = combo.combo_products.map((cp: any) => ({
        ...cp.product,
        quantity: cp.quantity || 1
      }));
      setSelectedProducts(productsWithQuantity);
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
    if (!imageFile) return comboData.image_url || null;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
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

  const addToCombo = (product: Product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCombo = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCombo(productId);
      return;
    }
    setSelectedProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, quantity } : p))
    );
  };

  const calculateTotal = () => {
    return selectedProducts.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0
    );
  };

  const calculateDiscountedPrice = () => {
    const total = calculateTotal();
    if (comboData.discount_percentage) {
      const discount = total * (parseInt(comboData.discount_percentage) / 100);
      return total - discount;
    }
    if (comboData.discount_price) {
      return parseFloat(comboData.discount_price);
    }
    return total;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (selectedProducts.length === 0) {
    alert('Please add at least one product to the combo');
    return;
  }

  setLoading(true);
  try {
    const token = localStorage.getItem('admin_token');
    
    // Upload image if selected
    const imageUrl = await uploadImage();

    // Create combo payload WITHOUT products array
    const comboPayload = {
      name: comboData.name,
      description: comboData.description,
      discount_percentage: comboData.discount_percentage ? parseInt(comboData.discount_percentage) : null,
      discount_price: comboData.discount_price ? parseFloat(comboData.discount_price) : null,
      image_url: imageUrl || comboData.image_url,
      is_active: comboData.is_active
    };

    console.log('Sending combo data:', comboPayload);

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = combo 
      ? `${baseUrl}/api/admin/combos/${combo.id}`
      : `${baseUrl}/api/admin/combos`;

    // First, save/update the combo
    const response = await fetch(url, {
      method: combo ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(comboPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to save combo' }));
      console.error('Server response:', errorData);
      throw new Error(errorData.message || errorData.error || 'Failed to save combo');
    }

    const responseData = await response.json();
    const comboId = combo ? combo.id : responseData.combo.id;
    
    // Now, handle the combo products separately
    // For update, we need to delete existing products first
    if (combo) {
      // Delete existing combo products
      const deleteResponse = await fetch(`${baseUrl}/api/admin/combos/${comboId}/products`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!deleteResponse.ok) {
        console.error('Failed to delete existing products');
      }
    }
    
    // Add new products
    if (selectedProducts.length > 0) {
      const productsPayload = {
        products: selectedProducts.map(p => ({
          product_id: p.id,
          quantity: p.quantity
        }))
      };
      
      const productsResponse = await fetch(`${baseUrl}/api/admin/combos/${comboId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productsPayload),
      });
      
      if (!productsResponse.ok) {
        const errorData = await productsResponse.json();
        console.error('Error adding products:', errorData);
        throw new Error('Failed to add products to combo');
      }
    }

    console.log('Save successful:', responseData);

    alert(combo ? 'Combo updated successfully!' : 'Combo created successfully!');
    onSuccess();
    onClose();
  } catch (error: any) {
    console.error('Save combo error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-semibold">
              {combo ? 'Edit Combo' : 'Create New Combo'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium mb-3">Combo Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-premium-gold transition-colors">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="mx-auto max-h-48 rounded-lg"
                    />
                    <div className="absolute bottom-2 right-2">
                      <label className="p-2 bg-white shadow-md rounded-full hover:bg-gray-50 cursor-pointer">
                        <Camera className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Click to upload combo image</p>
                    <p className="text-sm text-gray-500 mb-4">JPEG, PNG, WebP (Max 5MB)</p>
                    <label className="inline-flex items-center px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Image
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
                  <div className="mt-2 text-sm text-blue-600">Uploading...</div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Combo Information</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Combo Name *</label>
                  <input
                    type="text"
                    value={comboData.name}
                    onChange={(e) => setComboData({...comboData, name: e.target.value})}
                    required
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="Premium Anniversary Combo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={comboData.description}
                    onChange={(e) => setComboData({...comboData, description: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="Describe this combo..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Discount %</label>
                    <input
                      type="number"
                      value={comboData.discount_percentage}
                      onChange={(e) => setComboData({...comboData, discount_percentage: e.target.value})}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="15"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Discounted Price (₹)</label>
                    <input
                      type="number"
                      value={comboData.discount_price}
                      onChange={(e) => setComboData({...comboData, discount_price: e.target.value})}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="4999"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={comboData.is_active}
                    onChange={(e) => setComboData({...comboData, is_active: e.target.checked})}
                    className="h-4 w-4 text-premium-gold rounded"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Combo is active (visible to customers)
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Selected Products ({selectedProducts.length})</h3>
                
                {selectedProducts.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No products selected yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedProducts.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <h4 className="font-medium line-clamp-1">{product.name}</h4>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(product.price)} × {product.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, product.quantity - 1)}
                              className="p-1 hover:bg-white rounded"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{product.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, product.quantity + 1)}
                              className="p-1 hover:bg-white rounded"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCombo(product.id)}
                            className="p-2 hover:bg-white rounded-lg text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedProducts.length > 0 && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                      {comboData.discount_percentage && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Discount ({comboData.discount_percentage}%):</span>
                          <span className="text-green-600">
                            -{formatCurrency(calculateTotal() * (parseInt(comboData.discount_percentage) / 100))}
                          </span>
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Final Price:</span>
                          <span className="text-premium-gold">
                            {formatCurrency(calculateDiscountedPrice())}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Available Products</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-2">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="border rounded-lg p-4 hover:border-premium-gold transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium line-clamp-1">{product.name}</h4>
                        <p className="text-premium-gold font-semibold">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            {product.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCombo(product)}
                            className="px-3 py-1 bg-premium-gold text-white text-sm rounded hover:bg-premium-burgundy"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || selectedProducts.length === 0}
                className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {combo ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    {combo ? 'Update Combo' : 'Create Combo'}
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

export default ComboManager;