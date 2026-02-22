import React, { useState, useEffect } from 'react';
import {
  X, Plus, Save, Trash2, Edit, Search, RefreshCw,
  Eye, EyeOff, Clock, Gift, Calendar
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PopupConfig } from '../../types';

const PopupManager: React.FC = () => {
  const { fetchWithAuth } = useApi();
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PopupConfig | null>(null);

const [formData, setFormData] = useState({
  title: '',
  description: '',
  image_url: '',
  discount_text: 'Rs {value} off on {collection} Collection',
  discount_value: '100',
  timer_enabled: true,
  timer_hours: 0,
  timer_minutes: 59,
  timer_seconds: 46,
  offer_text: 'Catch your discount before the timer runs out.',
  cta_text: 'Order Now',
  cta_link: '/products?category=holi',
  cash_on_delivery_text: 'Cash on Delivery',
  prepaid_discount_text: '5% Extra off on Prepaid orders',
  is_active: true,
  display_frequency: 'once_per_session',
});

  useEffect(() => {
    fetchPopups();
  }, []);

  const fetchPopups = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/api/admin/popups');
      setPopups(data || []);
    } catch (error) {
      console.error('Error fetching popups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPopup) {
        await fetchWithAuth(`/api/admin/popups/${editingPopup.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchWithAuth('/api/admin/popups', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      await fetchPopups();
      setShowAddModal(false);
      setEditingPopup(null);
      resetForm();
    } catch (error) {
      console.error('Error saving popup:', error);
    }
  };

  const toggleStatus = async (popup: PopupConfig) => {
    try {
      await fetchWithAuth(`/api/admin/popups/${popup.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !popup.is_active }),
      });
      await fetchPopups();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const deletePopup = async (id: string) => {
    if (!confirm('Delete this popup?')) return;
    try {
      await fetchWithAuth(`/api/admin/popups/${id}`, { method: 'DELETE' });
      await fetchPopups();
    } catch (error) {
      console.error('Error deleting popup:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      discount_text: 'Rs {value} off on {collection} Collection',
      discount_value: '100',
      timer_enabled: true,
      timer_hours: 0,
      timer_minutes: 59,
      timer_seconds: 46,
      offer_text: 'Catch your discount before the timer runs out.',
      cta_text: 'Order Now',
      cta_link: '/products?category=holi',
      cash_on_delivery_text: 'Cash on Delivery',
      prepaid_discount_text: '5% Extra off on Prepaid orders',
      is_active: true,
      display_frequency: 'once_per_session',
    });
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
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
            <Gift className="h-6 w-6 text-premium-gold" />
            Popup Manager
          </h2>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-premium-gold text-white rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Add Popup
          </button>
        </div>
      </div>

      {popups.length === 0 ? (
        <div className="p-12 text-center">
          <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No popups configured</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4">Title</th>
                <th className="text-left p-4">Discount</th>
                <th className="text-left p-4">Timer</th>
                <th className="text-left p-4">Frequency</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {popups.map((popup) => (
                <tr key={popup.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{popup.title}</p>
                      <p className="text-sm text-gray-500">{popup.description}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {popup.discount_text.replace('{value}', popup.discount_value)}
                    </span>
                  </td>
                  <td className="p-4">
                    {popup.timer_enabled ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>{popup.timer_hours}h {popup.timer_minutes}m {popup.timer_seconds}s</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Disabled</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="capitalize">{popup.display_frequency.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleStatus(popup)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        popup.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {popup.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPopup(popup);
                          setFormData({
                            title: popup.title,
                            description: popup.description || '',
                            image_url: popup.image_url || '',
                            discount_text: popup.discount_text,
                            discount_value: popup.discount_value,
                            timer_enabled: popup.timer_enabled,
                            timer_hours: popup.timer_hours,
                            timer_minutes: popup.timer_minutes,
                            timer_seconds: popup.timer_seconds,
                            offer_text: popup.offer_text,
                            cta_text: popup.cta_text,
                            cta_link: popup.cta_link || '',
                            cash_on_delivery_text: popup.cash_on_delivery_text,
                            prepaid_discount_text: popup.prepaid_discount_text,
                            is_active: popup.is_active,
                            display_frequency: popup.display_frequency,
                          });
                          setShowAddModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => deletePopup(popup.id)}
                        className="p-2 hover:bg-gray-100 rounded"
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
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-semibold">
                  {editingPopup ? 'Edit Popup' : 'Create Popup'}
                </h2>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Image URL</label>
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Discount Text</label>
                    <input
                      type="text"
                      value={formData.discount_text}
                      onChange={(e) => setFormData({...formData, discount_text: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Rs {value} off"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Discount Value</label>
                    <input
                      type="text"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.timer_enabled}
                      onChange={(e) => setFormData({...formData, timer_enabled: e.target.checked})}
                    />
                    Enable Timer
                  </label>
                </div>

                {formData.timer_enabled && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Hours</label>
                      <input
  type="number"
  value={formData.timer_hours || 0}
  onChange={(e) => setFormData({
    ...formData, 
    timer_hours: parseInt(e.target.value) || 0
  })}
  className="w-full px-4 py-2 border rounded-lg"
  min="0"
/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Minutes</label>
      <input
  type="number"
  value={formData.timer_minutes || 0}
  onChange={(e) => setFormData({
    ...formData, 
    timer_minutes: parseInt(e.target.value) || 0
  })}
  className="w-full px-4 py-2 border rounded-lg"
  min="0"
  max="59"
/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Seconds</label>
<input
  type="number"
  value={formData.timer_seconds || 0}
  onChange={(e) => setFormData({
    ...formData, 
    timer_seconds: parseInt(e.target.value) || 0
  })}
  className="w-full px-4 py-2 border rounded-lg"
  min="0"
  max="59"
/>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Offer Text</label>
                  <input
                    type="text"
                    value={formData.offer_text}
                    onChange={(e) => setFormData({...formData, offer_text: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">CTA Text</label>
                    <input
                      type="text"
                      value={formData.cta_text}
                      onChange={(e) => setFormData({...formData, cta_text: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CTA Link</label>
                    <input
                      type="text"
                      value={formData.cta_link}
                      onChange={(e) => setFormData({...formData, cta_link: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">COD Text</label>
                    <input
                      type="text"
                      value={formData.cash_on_delivery_text}
                      onChange={(e) => setFormData({...formData, cash_on_delivery_text: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Prepaid Discount Text</label>
                    <input
                      type="text"
                      value={formData.prepaid_discount_text}
                      onChange={(e) => setFormData({...formData, prepaid_discount_text: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Display Frequency</label>
                  <select
                    value={formData.display_frequency}
                    onChange={(e) => setFormData({...formData, display_frequency: e.target.value as any})}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="once_per_session">Once per session</option>
                    <option value="always">Always show</option>
                    <option value="once_per_day">Once per day</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    id="is_active"
                  />
                  <label htmlFor="is_active">Active</label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2 bg-premium-gold text-white rounded-lg">
                    <Save className="h-4 w-4 inline mr-2" />
                    {editingPopup ? 'Update' : 'Create'}
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

export default PopupManager;