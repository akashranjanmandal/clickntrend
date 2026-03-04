import React, { useState, useEffect } from 'react';
import { X, Save, Camera, RefreshCw, Users, Download, Image as ImageIcon, FileText, ChevronDown } from 'lucide-react';
import { Product, Gender, Category } from '../../types';
import { apiFetch } from '../../config';
import MultiImageUpload from './MultiImageUpload';
import toast from 'react-hot-toast';

interface EditProductProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

const EditProduct: React.FC<EditProductProps> = ({ product, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
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

  // Load product categories
  useEffect(() => {
    if (product.categories && product.categories.length > 0) {
      setSelectedCategories(product.categories.map(c => c.id));
    } else if (product.category) {
      // For backward compatibility, find category ID by name
      const category = categories.find(c => c.name === product.category);
      if (category) {
        setSelectedCategories([category.id]);
      }
    }
  }, [product, categories]);

  // Define the gender type
  type GenderType = 'men' | 'women' | 'unisex';

  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    gender: (product.gender || 'unisex') as GenderType,
    price: product.price.toString(),
    original_price: product.original_price?.toString() || '',
    discount_percentage: product.discount_percentage?.toString() || '',
    sku: product.sku || `SKU-${Date.now().toString().slice(-8)}`,
    stock_quantity: product.stock_quantity.toString(),
    is_customizable: product.is_customizable || false,
    customization_price: product.customization_price?.toString() || '0',
    max_customization_characters: product.max_customization_characters?.toString() || '50',
    max_customization_images: product.max_customization_images?.toString() || '10',
    max_customization_lines: product.max_customization_lines?.toString() || '10',
    social_proof_enabled: product.social_proof_enabled !== false,
    social_proof_text: product.social_proof_text || '🔺{count} People are Purchasing Right Now',
    social_proof_initial_count: product.social_proof_initial_count?.toString() || '5',
    social_proof_end_count: product.social_proof_end_count?.toString() || '15',
    is_active: product.is_active,
  });

  useEffect(() => {
    const price = parseFloat(formData.price) || 0;
    const originalPrice = parseFloat(formData.original_price) || 0;
    const discountPercent = parseFloat(formData.discount_percentage) || 0;

    // Mode 1: User changed price or original price -> calculate discount
    if (originalPrice > 0 && price > 0 && originalPrice > price) {
      const calculatedDiscount = Math.round(((originalPrice - price) / originalPrice) * 100);
      if (calculatedDiscount !== discountPercent) {
        setFormData(prev => ({ ...prev, discount_percentage: calculatedDiscount.toString() }));
      }
    } 
    // Mode 2: User changed discount percentage -> calculate price
    else if (originalPrice > 0 && discountPercent > 0 && discountPercent <= 100) {
      const calculatedPrice = originalPrice - (originalPrice * discountPercent / 100);
      if (Math.abs(calculatedPrice - price) > 0.01) {
        setFormData(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
      }
    }
    // Mode 3: No valid calculation
    else if (originalPrice === 0 || price === 0) {
      if (discountPercent > 0 && originalPrice === 0) {
        // Keep discount as is
      } else {
        setFormData(prev => ({ ...prev, discount_percentage: '' }));
      }
    }
  }, [formData.price, formData.original_price, formData.discount_percentage]);

  useEffect(() => {
    fetchCategories();
    fetchGenders();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiFetch('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchGenders = async () => {
    try {
      const data = await apiFetch('/api/genders');
      setGenders(data);
    } catch (error) {
      console.error('Error fetching genders:', error);
    }
  };

  const handleImagesUploaded = (images: { url: string; is_primary: boolean }[]) => {
    setProductImages(images);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation
  if (productImages.length === 0) {
    toast.error('Please upload at least one product image');
    return;
  }

  if (selectedCategories.length === 0) {
    toast.error('Please select at least one category');
    return;
  }

  setLoading(true);

  try {
    const token = localStorage.getItem('admin_token');
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    // Get primary image URL
    const primaryImage = productImages.find(img => img.is_primary) || productImages[0];
    
    // Prepare product data
    const productData: any = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      gender: formData.gender,
      price: parseFloat(formData.price),
      stock_quantity: parseInt(formData.stock_quantity),
      sku: formData.sku,
      image_url: primaryImage.url,
      social_proof_enabled: formData.social_proof_enabled,
      social_proof_text: formData.social_proof_text,
      social_proof_initial_count: parseInt(formData.social_proof_initial_count),
      social_proof_end_count: parseInt(formData.social_proof_end_count),
      updated_at: new Date().toISOString()
    };

    // Add optional fields
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
      productData.max_customization_images = parseInt(formData.max_customization_images);
      productData.max_customization_lines = parseInt(formData.max_customization_lines);
    }
    
    // Add additional images
    const additionalImageUrls = productImages
      .filter(img => !img.is_primary)
      .map(img => img.url);
    
    if (additionalImageUrls.length > 0) {
      productData.additional_images = additionalImageUrls;
    }
    
    productData.is_active = formData.is_active;

    console.log('Updating product:', productData);

    // UPDATE PRODUCT
    const response = await fetch(`${baseUrl}/api/admin/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Product update error:', errorData);
      throw new Error(errorData.message || errorData.error || 'Failed to update product');
    }

    console.log('Product updated successfully');

    // ========== DELETE EXISTING CATEGORIES ==========
    console.log('Deleting existing categories for product:', product.id);
    const deleteResponse = await fetch(`${baseUrl}/api/admin/products/${product.id}/categories`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      console.error('Delete categories error:', errorData);
      // Don't throw here, continue to add new categories
    } else {
      console.log('Existing categories deleted successfully');
    }

    // ========== ADD NEW CATEGORIES ==========
    if (selectedCategories.length > 0) {
      const categoriesPayload = {
        categories: selectedCategories.map(id => ({ category_id: id }))
      };

      console.log('Adding categories to product - Payload:', categoriesPayload);

      const categoriesResponse = await fetch(`${baseUrl}/api/admin/products/${product.id}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(categoriesPayload),
      });

      if (!categoriesResponse.ok) {
        const errorData = await categoriesResponse.json();
        console.error('Categories response error:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to add categories');
      }

      const categoriesResult = await categoriesResponse.json();
      console.log('Categories added successfully:', categoriesResult);
    }

    toast.success('Product updated successfully!');
    onSuccess();
    onClose();

  } catch (error: any) {
    console.error('Update error:', error);
    toast.error(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  // Generate a random preview count between initial and end
  const getRandomPreviewCount = () => {
    const initial = parseInt(formData.social_proof_initial_count) || 5;
    const end = parseInt(formData.social_proof_end_count) || 15;
    return Math.floor(Math.random() * (end - initial + 1)) + initial;
  };

  const [previewCount, setPreviewCount] = useState(getRandomPreviewCount());

  // Update preview when counts change
  useEffect(() => {
    setPreviewCount(getRandomPreviewCount());
  }, [formData.social_proof_initial_count, formData.social_proof_end_count]);

  // Calculate savings
  const savings = parseFloat(formData.original_price) && parseFloat(formData.price) 
    ? (parseFloat(formData.original_price) - parseFloat(formData.price)).toFixed(2)
    : '0';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

              {/* Multiple Categories Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Categories *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none text-left flex items-center justify-between bg-white"
                  >
                    <span className="truncate">
                      {selectedCategories.length === 0 
                        ? 'Select categories' 
                        : `${selectedCategories.length} category${selectedCategories.length > 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className={`h-5 w-5 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCategoryDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {categories.map(category => (
                        <label
                          key={category.id}
                          className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => toggleCategory(category.id)}
                            className="h-4 w-4 text-premium-gold rounded border-gray-300 focus:ring-premium-gold"
                          />
                          <span className="ml-3 flex-1">{category.name}</span>
                          {category.icon && (
                            <span className="text-xl">{category.icon}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedCategories.map(catId => {
                      const category = categories.find(c => c.id === catId);
                      return category ? (
                        <span
                          key={catId}
                          className="inline-flex items-center px-3 py-1 bg-premium-cream text-premium-burgundy rounded-full text-sm"
                        >
                          {category.icon && <span className="mr-1">{category.icon}</span>}
                          {category.name}
                          <button
                            type="button"
                            onClick={() => toggleCategory(catId)}
                            className="ml-2 hover:text-premium-gold"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value as 'men' | 'women' | 'unisex'})}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                >
                  {genders.map(gender => (
                    <option key={gender.name} value={gender.name}>
                      {gender.icon} {gender.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SKU *</label>
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
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none bg-gray-50"
                  placeholder="Auto-calculated"
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Live Preview
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border rounded-lg text-sm font-medium text-premium-gold">
                      {formData.social_proof_text.replace('{count}', previewCount.toString())}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewCount(getRandomPreviewCount())}
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
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-premium-gold" />
                Customization Options
              </h3>
              
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

             // In the customization section, conditionally show text fields
{formData.is_customizable && (
  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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

    {/* Only show text fields if max_customization_lines > 0 */}
    {parseInt(formData.max_customization_lines) > 0 && (
      <>
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Max Characters/Line
          </label>
          <input
            type="number"
            value={formData.max_customization_lines}
            onChange={(e) => setFormData({...formData, max_customization_lines: e.target.value})}
            min="0"
            max="20"
            className="w-full px-4 py-3 border rounded-lg"
            placeholder="10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Max Characters/Line
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
      </>
    )}

    {/* Images field always shown */}
    <div>
      <label className="block text-sm font-medium mb-2 flex items-center gap-1">
        <ImageIcon className="h-4 w-4" />
        Max Images
      </label>
      <input
        type="number"
        value={formData.max_customization_images}
        onChange={(e) => setFormData({...formData, max_customization_images: e.target.value})}
        min="0"
        max="30"
        className="w-full px-4 py-3 border rounded-lg"
        placeholder="10"
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