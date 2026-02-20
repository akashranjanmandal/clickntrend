import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config';
import {
  X, Plus, Save, Trash2, Edit, Search, RefreshCw,
  MoveUp, MoveDown, Eye, EyeOff, Palette,
  GripVertical
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🎁',
    color: 'from-pink-100 to-pink-50',
    display_order: 0,
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const colorOptions = [
    { value: 'from-pink-100 to-pink-50', label: 'Pink', bg: 'bg-pink-100' },
    { value: 'from-red-100 to-red-50', label: 'Red', bg: 'bg-red-100' },
    { value: 'from-rose-100 to-rose-50', label: 'Rose', bg: 'bg-rose-100' },
    { value: 'from-purple-100 to-purple-50', label: 'Purple', bg: 'bg-purple-100' },
    { value: 'from-blue-100 to-blue-50', label: 'Blue', bg: 'bg-blue-100' },
    { value: 'from-green-100 to-green-50', label: 'Green', bg: 'bg-green-100' },
    { value: 'from-yellow-100 to-yellow-50', label: 'Yellow', bg: 'bg-yellow-100' },
    { value: 'from-orange-100 to-orange-50', label: 'Orange', bg: 'bg-orange-100' },
    { value: 'from-teal-100 to-teal-50', label: 'Teal', bg: 'bg-teal-100' },
    { value: 'from-indigo-100 to-indigo-50', label: 'Indigo', bg: 'bg-indigo-100' },
  ];

  const iconOptions = [
    '🎂', '💝', '❤️', '💍', '💼', '🎄', '🌿', '👶', '🏠', '🙏', 
    '🎁', '✨', '🌟', '🎈', '🎉', '🥂', '🍫', '🌹', '💐', '👔',
    '👗', '⌚', '📱', '💻', '📷', '🎧', '🏆', '📚', '✈️', '🚗'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        console.error('No admin token found');
        window.location.href = '/admin';
        return;
      }

      const data = await apiFetch('/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Sort by display_order
      const sortedData = (data || []).sort((a: Category, b: Category) => a.display_order - b.display_order);
      setCategories(sortedData);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.icon) {
      errors.icon = 'Please select an icon';
    }
    
    if (!formData.color) {
      errors.color = 'Please select a color';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('admin_token');
      
      const data = await apiFetch(
        editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories',
        {
          method: editingCategory ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (data) {
        await fetchCategories();
        setShowAddModal(false);
        setEditingCategory(null);
        resetForm();
      }
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert(`Failed to save category: ${error.message}`);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category will need to be reassigned.')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const toggleCategoryStatus = async (category: Category) => {
    try {
      const token = localStorage.getItem('admin_token');
      await apiFetch(`/api/admin/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !category.is_active }),
      });

      await fetchCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
    }
  };

  const moveOrder = async (category: Category, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(c => c.id === category.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === categories.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const otherCategory = categories[newIndex];

    try {
      const token = localStorage.getItem('admin_token');
      
      // Swap display orders
      await Promise.all([
        apiFetch(`/api/admin/categories/${category.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ display_order: otherCategory.display_order }),
        }),
        apiFetch(`/api/admin/categories/${otherCategory.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ display_order: category.display_order }),
        }),
      ]);

      await fetchCategories();
    } catch (error) {
      console.error('Error reordering categories:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '🎁',
      color: 'from-pink-100 to-pink-50',
      display_order: categories.length,
      is_active: true,
    });
    setFormErrors({});
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon,
      color: category.color,
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setShowAddModal(true);
  };

  const filteredCategories = categories.filter(category => {
    const matchesSearch = 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (filterStatus) {
      case 'active':
        return category.is_active;
      case 'inactive':
        return !category.is_active;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-100 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-premium-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-semibold flex items-center">
              <Palette className="h-6 w-6 mr-2 text-premium-gold" />
              Category Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Organize your products with custom categories
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold w-full sm:w-64"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold"
            >
              <option value="all">All Categories</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={() => {
                resetForm();
                setEditingCategory(null);
                setShowAddModal(true);
              }}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </button>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      {filteredCategories.length === 0 ? (
        <div className="p-12 text-center">
          <Palette className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No categories found</p>
          <p className="text-sm text-gray-400 mb-6">
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first category to organize products'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <button
              onClick={() => {
                resetForm();
                setEditingCategory(null);
                setShowAddModal(true);
              }}
              className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy"
            >
              + Create Your First Category
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 w-16">Order</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Description</th>
                <th className="text-left p-4">Icon</th>
                <th className="text-left p-4">Color</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category, index) => (
                <tr key={category.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <span className="text-sm text-gray-500">{category.display_order}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center mr-3`}>
                        <span className="text-lg">{category.icon}</span>
                      </div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-gray-600 max-w-xs line-clamp-2">
                      {category.description || 'No description'}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="text-2xl">{category.icon}</span>
                  </td>
                  <td className="p-4">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${category.color}`} />
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleCategoryStatus(category)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        category.is_active 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => moveOrder(category, 'up')}
                        disabled={index === 0}
                        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
                          index === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Move Up"
                      >
                        <MoveUp className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => moveOrder(category, 'down')}
                        disabled={index === categories.length - 1}
                        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
                          index === categories.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Move Down"
                      >
                        <MoveDown className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => editCategory(category)}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-semibold flex items-center">
                  <Palette className="h-5 w-5 mr-2 text-premium-gold" />
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h2>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none ${
                        formErrors.name ? 'border-red-500' : ''
                      }`}
                      placeholder="e.g., Birthday, Anniversary"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Display Order</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                      min="0"
                      className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="Brief description of this category..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Icon <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                      {iconOptions.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({...formData, icon})}
                          className={`p-3 text-2xl rounded hover:bg-premium-gold/10 transition-colors ${
                            formData.icon === icon ? 'bg-premium-gold/20 ring-2 ring-premium-gold' : ''
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    {formErrors.icon && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.icon}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Color Theme <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({...formData, color: color.value})}
                          className={`flex items-center space-x-3 p-2 rounded hover:bg-gray-50 transition-colors ${
                            formData.color === color.value ? 'bg-premium-gold/10 ring-2 ring-premium-gold' : ''
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color.value}`} />
                          <span className="text-sm">{color.label}</span>
                        </button>
                      ))}
                    </div>
                    {formErrors.color && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.color}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="h-4 w-4 text-premium-gold rounded focus:ring-premium-gold"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Category is active (visible to customers)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingCategory(null);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy flex items-center"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;