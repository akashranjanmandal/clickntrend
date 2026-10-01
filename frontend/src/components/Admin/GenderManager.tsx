import React, { useEffect, useState } from 'react';
import { Users, Plus, Edit, Trash2, X, Save, RefreshCw, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../utils/api';
import { Gender } from '../../types';

const ICON_SUGGESTIONS = ['👨', '👩', '🧑‍🤝‍🧑', '👦', '👧', '👶', '🧒', '👴', '👵', '💑', '🎁', '✨'];

const emptyForm = { name: '', display_name: '', icon: '', is_active: true };

// "Kids & Teens" -> "kids-teens"
const toKey = (text: string) =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

const GenderManager: React.FC = () => {
  const [genders, setGenders] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Gender | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [keyTouched, setKeyTouched] = useState(false);

  useEffect(() => { fetchGenders(); }, []);

  const fetchGenders = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Gender[]>('/api/genders/admin');
      setGenders(data || []);
    } catch (error: any) {
      toast.error(`Failed to load genders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setKeyTouched(false);
    setShowModal(true);
  };

  const openEdit = (gender: Gender) => {
    setEditing(gender);
    setForm({ name: gender.name, display_name: gender.display_name, icon: gender.icon || '', is_active: gender.is_active });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name.trim()) { toast.error('Display name is required'); return; }
    if (!editing && !form.name) { toast.error('Key is required'); return; }

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/genders/admin/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ display_name: form.display_name, icon: form.icon, is_active: form.is_active }),
        });
        toast.success('Gender updated');
      } else {
        await apiFetch('/api/genders/admin', {
          method: 'POST',
          body: JSON.stringify({ name: form.name, display_name: form.display_name, icon: form.icon, is_active: form.is_active }),
        });
        toast.success('Gender added');
      }
      setShowModal(false);
      fetchGenders();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (gender: Gender) => {
    try {
      await apiFetch(`/api/genders/admin/${gender.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !gender.is_active }),
      });
      setGenders(prev => prev.map(g => g.id === gender.id ? { ...g, is_active: !g.is_active } : g));
      toast.success(`${gender.display_name} ${gender.is_active ? 'hidden from' : 'shown on'} the shop`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteGender = async (gender: Gender) => {
    if (gender.product_count) {
      toast.error(`${gender.product_count} product(s) use "${gender.display_name}". Change them first, or hide it instead.`);
      return;
    }
    if (!confirm(`Delete "${gender.display_name}"?`)) return;
    try {
      await apiFetch(`/api/genders/admin/${gender.id}`, { method: 'DELETE' });
      setGenders(prev => prev.filter(g => g.id !== gender.id));
      toast.success('Gender deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Swap positions with the neighbour, then save the new order for every row
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= genders.length) return;
    const reordered = [...genders];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrder = reordered.map((g, i) => ({ ...g, display_order: i + 1 }));
    const changed = withOrder.filter(g => genders.find(o => o.id === g.id)?.display_order !== g.display_order);
    setGenders(withOrder);
    try {
      await Promise.all(
        changed.map(g => apiFetch(`/api/genders/admin/${g.id}`, {
            method: 'PUT',
            body: JSON.stringify({ display_order: g.display_order }),
          }))
      );
    } catch (error: any) {
      toast.error(`Failed to save order: ${error.message}`);
      fetchGenders();
    }
  };

  if (loading) return (
    <div className="bg-white rounded-xl p-8 text-center">
      <RefreshCw className="h-8 w-8 animate-spin text-premium-gold mx-auto" />
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
              <Users className="h-6 w-6 text-premium-gold" />
              Gender Management
            </h2>
            <p className="text-sm text-gray-600">
              The "For" options shoppers filter by (Men, Women, Unisex…). Unisex items also appear under every other option.
            </p>
          </div>
          <div>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy">
              <Plus className="h-4 w-4" />Add Gender
            </button>
          </div>
        </div>
      </div>

      {genders.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p className="mb-3">No genders yet.</p>
          <button onClick={openAdd} className="text-premium-gold hover:underline">Add your first one</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm text-gray-600">
              <tr>
                <th className="p-4 w-20">Order</th>
                <th className="p-4">Gender</th>
                <th className="p-4">Key</th>
                <th className="p-4">Products</th>
                <th className="p-4">Shown on shop</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {genders.map((gender, index) => (
                <tr key={gender.id} className={`border-b hover:bg-gray-50 ${gender.is_active ? '' : 'opacity-60'}`}>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <button onClick={() => move(index, -1)} disabled={index === 0} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-20" title="Move up">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => move(index, 1)} disabled={index === genders.length - 1} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-20" title="Move down">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl w-8 text-center">{gender.icon || '—'}</span>
                      <span className="font-medium">{gender.display_name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-600">{gender.name}</td>
                  <td className="p-4 text-sm">{gender.product_count ?? 0}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(gender)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        gender.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {gender.is_active ? <><Eye className="h-3 w-3" />Shown</> : <><EyeOff className="h-3 w-3" />Hidden</>}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(gender)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteGender(gender)}
                        className={`p-2 rounded-lg ${gender.product_count ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-red-50 text-red-600'}`}
                        title={gender.product_count ? 'In use by products — hide it instead' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-semibold">{editing ? 'Edit Gender' : 'Add Gender'}</h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Display name *</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={e => {
                    const display_name = e.target.value;
                    setForm(f => ({ ...f, display_name, name: !editing && !keyTouched ? toKey(display_name) : f.name }));
                  }}
                  placeholder="e.g. Kids"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold"
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-500 mt-1">What shoppers see on the filter buttons.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Key {editing ? '' : '*'}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => { setKeyTouched(true); setForm(f => ({ ...f, name: toKey(e.target.value) })); }}
                  disabled={!!editing}
                  placeholder="e.g. kids"
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:border-premium-gold disabled:bg-gray-50 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editing
                    ? 'Saved on products, so it cannot be changed. Edit the display name instead.'
                    : 'Saved on each product. Lowercase letters, numbers and dashes; cannot be changed later.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Icon</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={form.icon}
                    onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                    placeholder="Emoji (optional)"
                    className="w-32 px-4 py-2 border rounded-lg text-xl focus:outline-none focus:border-premium-gold"
                  />
                  {form.icon && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, icon: '' }))} className="text-sm text-gray-500 hover:text-red-600">
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {ICON_SUGGESTIONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`w-9 h-9 text-xl rounded-lg border ${form.icon === icon ? 'border-premium-gold bg-premium-cream' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded text-premium-gold"
                />
                <span className="text-sm">Show on the shop filters</span>
              </label>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-50">
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editing ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenderManager;
