import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Search, Package, Trash2, Save, Upload, Camera, Filter, Tag, ChevronDown, Check } from 'lucide-react';
import { Product, Combo, Category } from '../../types';
import { formatCurrency, getImageUrl } from '../../utils/helpers';
import { apiFetch } from '../../config';
import toast from 'react-hot-toast';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [genders, setGenders] = useState<{name: string, display_name: string}[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ComboProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
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
    fetchCategories();
    fetchGenders();
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

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiFetch('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // Filter only active categories
      const activeCategories = (data || []).filter((cat: Category) => cat.is_active !== false);
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchGenders = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const data = await apiFetch('/api/admin/genders', {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => [
        { name: 'men', display_name: 'Men' },
        { name: 'women', display_name: 'Women' },
        { name: 'unisex', display_name: 'Unisex' }
      ]);
      setGenders(data || []);
    } catch (error) {
      console.error('Error fetching genders:', error);
      // Fallback genders
      setGenders([
        { name: 'men', display_name: 'Men' },
        { name: 'women', display_name: 'Women' },
        { name: 'unisex', display_name: 'Unisex' }
      ]);
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

    // Load categories
    if (combo.categories && combo.categories.length > 0) {
      setSelectedCategories(combo.categories.map(c => c.id));
    } else if (combo.category) {
      // For backward compatibility, find category ID by name
      const category = categories.find(c => c.name === combo.category);
      if (category) {
        setSelectedCategories([category.id]);
      }
    }

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
        toast.error('Image size should be less than 5MB');
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
      const baseUrl = import.meta.env.VITE_API_URL || '';
      
      const response = await fetch(`${baseUrl}/api/admin/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      return data.image_url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
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
    toast.success(`Added ${product.name} to combo`);
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

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Filter products by multiple categories, gender, and search term
  const filteredProducts = products.filter(product => {
    // Handle category filter - if 'all' or if product has any of the selected filter categories
    const matchesCategory = selectedCategoryFilter === 'all' || 
      (product.categories && product.categories.some(c => c.id === selectedCategoryFilter)) ||
      product.category === selectedCategoryFilter; // For backward compatibility
    
    const matchesGender = selectedGender === 'all' || product.gender === selectedGender;
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.categories && product.categories.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesGender && matchesSearch;
  });

  // Get all categories from products for filter (including legacy single category)
  const availableCategories = [
    ...new Set([
      ...products.flatMap(p => p.categories?.map(c => c.name) || []),
      ...products.map(p => p.category).filter(Boolean)
    ])
  ].sort();

  // Get category objects for filter
  const filterCategories = categories.filter(cat => 
    availableCategories.includes(cat.name)
  );

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation
  if (selectedProducts.length === 0) {
    toast.error('Please add at least one product to the combo');
    return;
  }

  if (selectedCategories.length === 0) {
    toast.error('Please select at least one category for this combo');
    return;
  }

  setLoading(true);
  
  try {
    const token = localStorage.getItem('admin_token');
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    // Upload image if selected
    let imageUrl = comboData.image_url;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        throw new Error('Failed to upload image');
      }
    }

    // Prepare combo payload
    const comboPayload = {
      name: comboData.name.trim(),
      description: comboData.description.trim(),
      discount_percentage: comboData.discount_percentage ? parseInt(comboData.discount_percentage) : null,
      discount_price: comboData.discount_price ? parseFloat(comboData.discount_price) : null,
      image_url: imageUrl || '',
      is_active: comboData.is_active
    };

    console.log('Saving combo:', comboPayload);

    let comboId: string;

    if (combo) {
      // UPDATE EXISTING COMBO
      const updateResponse = await fetch(`${baseUrl}/api/admin/combos/${combo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(comboPayload),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || errorData.error || 'Failed to update combo');
      }

      comboId = combo.id;
      console.log('Combo updated successfully:', comboId);
      
    } else {
      // CREATE NEW COMBO
      const createResponse = await fetch(`${baseUrl}/api/admin/combos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(comboPayload),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || errorData.error || 'Failed to create combo');
      }

      const result = await createResponse.json();
      comboId = result.combo?.id || result.id;
      console.log('Combo created successfully:', comboId);
    }

    // ========== ADD PRODUCTS TO COMBO ==========
    if (selectedProducts.length > 0) {
      // First delete existing products
      await fetch(`${baseUrl}/api/admin/combos/${comboId}/products`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const productsPayload = {
        products: selectedProducts.map(p => ({
          product_id: p.id,
          quantity: p.quantity
        }))
      };

      console.log('Adding products to combo:', productsPayload);

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
        throw new Error(errorData.message || errorData.error || 'Failed to add products');
      }

      const productsResult = await productsResponse.json();
      console.log('Products added successfully:', productsResult);
    }

    // ========== ADD CATEGORIES TO COMBO ==========
    if (selectedCategories.length > 0) {
      // First delete existing categories
      await fetch(`${baseUrl}/api/admin/combos/${comboId}/categories`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const categoriesPayload = {
        categories: selectedCategories.map(categoryId => ({
          category_id: categoryId
        }))
      };

      console.log('Adding categories to combo - Payload:', categoriesPayload);

      const categoriesResponse = await fetch(`${baseUrl}/api/admin/combos/${comboId}/categories`, {
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

    toast.success(combo ? 'Combo updated successfully!' : 'Combo created successfully!');
    onSuccess();
    onClose();

  } catch (error: any) {
    console.error('Save combo error:', error);
    toast.error(`Error: ${error.message}`);
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
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.categories?.map(cat => (
                                <span key={cat.id} className="px-2 py-0.5 bg-gray-100 text-xs rounded">
                                  {cat.name}
                                </span>
                              ))}
                              {product.category && !product.categories && (
                                <span className="px-2 py-0.5 bg-gray-100 text-xs rounded">
                                  {product.category}
                                </span>
                              )}
                              {product.gender && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded capitalize">
                                  {product.gender}
                                </span>
                              )}
                            </div>
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
                <div className="flex flex-wrap gap-2">
                  {/* Category Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="pl-10 pr-8 py-2 border rounded-lg focus:border-premium-gold focus:outline-none appearance-none bg-white min-w-[180px]"
                    >
                      <option value="all">All Categories</option>
                      {filterCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon && <span>{cat.icon} </span>}
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Gender Filter */}
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={selectedGender}
                      onChange={(e) => setSelectedGender(e.target.value)}
                      className="pl-10 pr-8 py-2 border rounded-lg focus:border-premium-gold focus:outline-none appearance-none bg-white min-w-[150px]"
                    >
                      <option value="all">All Genders</option>
                      {genders.map(g => (
                        <option key={g.name} value={g.name}>{g.display_name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Search Input */}
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
              </div>

              {/* Products Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No products found matching your filters
                  </div>
                ) : (
                  filteredProducts.map(product => (
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
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            {product.categories?.map(cat => (
                              <span key={cat.id} className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">
                                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                                {cat.name}
                              </span>
                            ))}
                            {product.category && !product.categories && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">
                                {product.category}
                              </span>
                            )}
                            {product.gender && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs capitalize">
                                {product.gender}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCombo(product)}
                            className="mt-3 w-full px-3 py-1.5 bg-premium-gold text-white text-sm rounded hover:bg-premium-burgundy transition-colors"
                          >
                            Add to Combo
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
                disabled={loading || selectedProducts.length === 0 || selectedCategories.length === 0}
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