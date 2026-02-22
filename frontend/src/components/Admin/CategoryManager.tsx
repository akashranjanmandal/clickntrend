import React, { useState, useEffect } from 'react';
import {
  X, Plus, Save, Trash2, Edit, Search, RefreshCw,
  MoveUp, MoveDown, Eye, EyeOff, Palette,
  GripVertical, Gift, Heart, Star, Sparkles, Cake, Diamond,
  Briefcase, TreePine, Flower2, Baby, Home, ThumbsUp,
  Crown, Gem, Rocket, Award, Zap, Sun
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  icon_type: 'emoji' | 'lucide';
  color: string;
  hover_effect: string;
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
    icon: 'Gift',
    icon_type: 'lucide' as 'emoji' | 'lucide',
    color: 'from-pink-100 to-pink-50',
    hover_effect: 'scale',
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

  const hoverEffects = [
    { value: 'scale', label: 'Scale', icon: '↗️' },
    { value: 'rotate', label: 'Rotate', icon: '🔄' },
    { value: 'bounce', label: 'Bounce', icon: '🔄' },
    { value: 'pulse', label: 'Pulse', icon: '✨' },
  ];

  const lucideIcons = [
    { name: 'Gift', component: Gift },
    { name: 'Heart', component: Heart },
    { name: 'Star', component: Star },
    { name: 'Sparkles', component: Sparkles },
    { name: 'Cake', component: Cake },
    { name: 'Diamond', component: Diamond },
    { name: 'Briefcase', component: Briefcase },
    { name: 'TreePine', component: TreePine },
    { name: 'Flower2', component: Flower2 },
    { name: 'Baby', component: Baby },
    { name: 'Home', component: Home },
    { name: 'ThumbsUp', component: ThumbsUp },
    { name: 'Crown', component: Crown },
    { name: 'Gem', component: Gem },
    { name: 'Rocket', component: Rocket },
    { name: 'Award', component: Award },
    { name: 'Zap', component: Zap },
    { name: 'Sun', component: Sun },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      const sortedData = (data || []).sort((a: Category, b: Category) => a.display_order - b.display_order);
      setCategories(sortedData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Category name is required';
    if (!formData.icon) errors.icon = 'Please select an icon';
    if (!formData.color) errors.color = 'Please select a color';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('admin_token');
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      
      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCategories();
        setShowAddModal(false);
        setEditingCategory(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const toggleStatus = async (category: Category) => {
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`/api/admin/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      await fetchCategories();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const moveOrder = async (category: Category, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === category.id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === categories.length - 1)) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const otherCategory = categories[newIndex];
    const token = localStorage.getItem('admin_token');

    try {
      await Promise.all([
        fetch(`/api/admin/categories/${category.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ display_order: otherCategory.display_order }),
        }),
        fetch(`/api/admin/categories/${otherCategory.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ display_order: category.display_order }),
        }),
      ]);
      await fetchCategories();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'Gift',
      icon_type: 'lucide',
      color: 'from-pink-100 to-pink-50',
      hover_effect: 'scale',
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
      icon_type: category.icon_type || 'emoji',
      color: category.color,
      hover_effect: category.hover_effect || 'scale',
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setShowAddModal(true);
  };

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'active') return category.is_active;
    if (filterStatus === 'inactive') return !category.is_active;
    return true;
  });

  const renderIcon = (iconName: string, iconType: string, className: string = 'w-5 h-5') => {
    if (iconType === 'lucide') {
      const Icon = lucideIcons.find(i => i.name === iconName)?.component || Gift;
      return <Icon className={className} />;
    }
    return <span className="text-2xl">{iconName}</span>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-premium-gold mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
              <Palette className="h-6 w-6 text-premium-gold" />
              Category Management
            </h2>
            <p className="text-sm text-gray-600">Manage product categories and their appearance</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="px-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="p-12 text-center">
          <Palette className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No categories found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left">Order</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">Icon</th>
                <th className="p-4 text-left">Color</th>
                <th className="p-4 text-left">Hover Effect</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category, index) => (
                <tr key={category.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <span className="text-sm">{category.display_order}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                        {renderIcon(category.icon, category.icon_type, 'w-5 h-5')}
                      </div>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {renderIcon(category.icon, category.icon_type, 'w-6 h-6')}
                  </td>
                  <td className="p-4">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${category.color}`} />
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                      {category.hover_effect}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleStatus(category)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        category.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveOrder(category, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                      >
                        <MoveUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveOrder(category, 'down')}
                        disabled={index === categories.length - 1}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                      >
                        <MoveDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => editCategory(category)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="p-1 hover:bg-gray-100 rounded"
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-semibold">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h2>
                <button onClick={() => { setShowAddModal(false); setEditingCategory(null); }}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-lg ${formErrors.name ? 'border-red-500' : ''}`}
                      placeholder="e.g., Birthday"
                    />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Display Order</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="Brief description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Icon Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="lucide"
                        checked={formData.icon_type === 'lucide'}
                        onChange={(e) => setFormData({...formData, icon_type: e.target.value as any})}
                      />
                      Lucide Icons
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="emoji"
                        checked={formData.icon_type === 'emoji'}
                        onChange={(e) => setFormData({...formData, icon_type: e.target.value as any})}
                      />
                      Emoji
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Icon</label>
                  {formData.icon_type === 'lucide' ? (
                    <div className="grid grid-cols-6 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                      {lucideIcons.map(icon => {
                        const Icon = icon.component;
                        return (
                          <button
                            key={icon.name}
                            type="button"
                            onClick={() => setFormData({...formData, icon: icon.name})}
                            className={`p-3 rounded-lg hover:bg-premium-gold/10 ${
                              formData.icon === icon.name ? 'bg-premium-gold/20 ring-2 ring-premium-gold' : ''
                            }`}
                          >
                            <Icon className="w-6 h-6 mx-auto" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                      {['🎂', '💝', '❤️', '💍', '💼', '🎄', '🌿', '👶', '🏠', '🙏', '🎁', '✨', '🌟', '🎈', '🎉', '🥂', '🍫', '🌹', '💐', '👔'].map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({...formData, icon})}
                          className={`p-3 text-2xl rounded-lg hover:bg-premium-gold/10 ${
                            formData.icon === icon ? 'bg-premium-gold/20 ring-2 ring-premium-gold' : ''
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Color</label>
                    <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({...formData, color: color.value})}
                          className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 ${
                            formData.color === color.value ? 'bg-premium-gold/10 ring-2 ring-premium-gold' : ''
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${color.value}`} />
                          <span className="text-sm">{color.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Hover Effect</label>
                    <div className="space-y-2">
                      {hoverEffects.map(effect => (
                        <button
                          key={effect.value}
                          type="button"
                          onClick={() => setFormData({...formData, hover_effect: effect.value})}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border ${
                            formData.hover_effect === effect.value
                              ? 'border-premium-gold bg-premium-gold/5'
                              : 'border-gray-200 hover:border-premium-gold'
                          }`}
                        >
                          <span className="text-xl">{effect.icon}</span>
                          <span>{effect.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded text-premium-gold"
                  />
                  <label htmlFor="is_active">Active (visible to customers)</label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy">
                    <Save className="h-5 w-5 inline mr-2" />
                    {editingCategory ? 'Update' : 'Create'}
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