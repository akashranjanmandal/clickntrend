import React, { useState, useEffect } from 'react';
import {
  X, Plus, Save, Trash2, Edit, Search, RefreshCw,
  MoveUp, MoveDown, Eye, EyeOff, Video, Image,
  Play, Pause, Volume2, VolumeX, Link
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';

interface HeroContent {
  id: string;
  title: string;
  subtitle: string;
  media_type: 'image' | 'video';
  media_url: string;
  video_poster_url?: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  cta_text?: string;
  cta_link?: string;
  is_active: boolean;
  display_order: number;
}

const HeroManager: React.FC = () => {
  const { fetchWithAuth } = useApi();
  const [heroes, setHeroes] = useState<HeroContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHero, setEditingHero] = useState<HeroContent | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    media_type: 'image' as 'image' | 'video',
    media_url: '',
    video_poster_url: '',
    autoplay: true,
    loop: true,
    muted: true,
    cta_text: '',
    cta_link: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchHeroes();
  }, []);

  const fetchHeroes = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/api/admin/hero');
      setHeroes(data.sort((a: HeroContent, b: HeroContent) => a.display_order - b.display_order));
    } catch (error) {
      console.error('Error fetching heroes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHero) {
        await fetchWithAuth(`/api/admin/hero/${editingHero.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchWithAuth('/api/admin/hero/', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      await fetchHeroes();
      setShowAddModal(false);
      setEditingHero(null);
      resetForm();
    } catch (error) {
      console.error('Error saving hero:', error);
    }
  };

  const deleteHero = async (id: string) => {
    if (!confirm('Delete this hero section?')) return;
    try {
      await fetchWithAuth(`/api/admin/hero/${id}`, { method: 'DELETE' });
      await fetchHeroes();
    } catch (error) {
      console.error('Error deleting hero:', error);
    }
  };

  const toggleStatus = async (hero: HeroContent) => {
    try {
      await fetchWithAuth(`/api/admin/hero/${hero.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !hero.is_active }),
      });
      await fetchHeroes();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const moveOrder = async (hero: HeroContent, direction: 'up' | 'down') => {
    const index = heroes.findIndex(h => h.id === hero.id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === heroes.length - 1)) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const otherHero = heroes[newIndex];

    try {
      await Promise.all([
        fetchWithAuth(`/apiadmin/hero/${hero.id}`, {
          method: 'PUT',
          body: JSON.stringify({ display_order: otherHero.display_order }),
        }),
        fetchWithAuth(`/api/admin/hero/${otherHero.id}`, {
          method: 'PUT',
          body: JSON.stringify({ display_order: hero.display_order }),
        }),
      ]);
      await fetchHeroes();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      media_type: 'image',
      media_url: '',
      video_poster_url: '',
      autoplay: true,
      loop: true,
      muted: true,
      cta_text: '',
      cta_link: '',
      is_active: true,
      display_order: heroes.length,
    });
  };

  const editHero = (hero: HeroContent) => {
    setEditingHero(hero);
    setFormData({
      title: hero.title,
      subtitle: hero.subtitle,
      media_type: hero.media_type,
      media_url: hero.media_url,
      video_poster_url: hero.video_poster_url || '',
      autoplay: hero.autoplay || true,
      loop: hero.loop || true,
      muted: hero.muted || true,
      cta_text: hero.cta_text || '',
      cta_link: hero.cta_link || '',
      is_active: hero.is_active,
      display_order: hero.display_order,
    });
    setShowAddModal(true);
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
              <Video className="h-6 w-6 text-premium-gold" />
              Hero Sections
            </h2>
            <p className="text-sm text-gray-600">Manage homepage hero banners and videos</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy"
          >
            <Plus className="h-4 w-4" />
            Add Hero Section
          </button>
        </div>
      </div>

      {heroes.length === 0 ? (
        <div className="p-12 text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hero sections added yet</p>
        </div>
      ) : (
        <div className="divide-y">
          {heroes.map((hero, index) => (
            <div key={hero.id} className="p-6 hover:bg-gray-50">
              <div className="flex gap-4">
                {/* Preview */}
                <div className="w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {hero.media_type === 'video' ? (
                    <video
                      src={hero.media_url}
                      poster={hero.video_poster_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={hero.media_url}
                      alt={hero.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{hero.title}</h3>
                      <p className="text-sm text-gray-600">{hero.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        hero.media_type === 'video' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {hero.media_type === 'video' ? 'Video' : 'Image'}
                      </span>
                      <button
                        onClick={() => toggleStatus(hero)}
                        className={`px-2 py-1 rounded-full text-xs ${
                          hero.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {hero.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  {hero.cta_text && (
                    <p className="text-sm text-gray-500 mb-2">
                      CTA: {hero.cta_text} → {hero.cta_link}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-4">
                    <button
                      onClick={() => moveOrder(hero, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                      <MoveUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveOrder(hero, 'down')}
                      disabled={index === heroes.length - 1}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                      <MoveDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => editHero(hero)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => deleteHero(hero.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-semibold">
                  {editingHero ? 'Edit Hero Section' : 'Add Hero Section'}
                </h2>
                <button onClick={() => { setShowAddModal(false); setEditingHero(null); }}>
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
                    <label className="block text-sm font-medium mb-2">Display Order</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Subtitle</label>
                  <textarea
                    value={formData.subtitle}
                    onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Media Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="image"
                        checked={formData.media_type === 'image'}
                        onChange={(e) => setFormData({...formData, media_type: e.target.value as 'image'})}
                      />
                      <Image className="h-4 w-4" /> Image
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="video"
                        checked={formData.media_type === 'video'}
                        onChange={(e) => setFormData({...formData, media_type: e.target.value as 'video'})}
                      />
                      <Video className="h-4 w-4" /> Video
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Media URL *</label>
                  <input
                    type="url"
                    value={formData.media_url}
                    onChange={(e) => setFormData({...formData, media_url: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="https://..."
                    required
                  />
                </div>

                {formData.media_type === 'video' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Video Poster URL</label>
                    <input
                      type="url"
                      value={formData.video_poster_url}
                      onChange={(e) => setFormData({...formData, video_poster_url: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                )}

                {formData.media_type === 'video' && (
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.autoplay}
                        onChange={(e) => setFormData({...formData, autoplay: e.target.checked})}
                      />
                      <Play className="h-4 w-4" /> Autoplay
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.loop}
                        onChange={(e) => setFormData({...formData, loop: e.target.checked})}
                      />
                      Loop
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.muted}
                        onChange={(e) => setFormData({...formData, muted: e.target.checked})}
                      />
                      <VolumeX className="h-4 w-4" /> Muted
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">CTA Text</label>
                    <input
                      type="text"
                      value={formData.cta_text}
                      onChange={(e) => setFormData({...formData, cta_text: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Shop Now"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CTA Link</label>
                    <input
                      type="url"
                      value={formData.cta_link}
                      onChange={(e) => setFormData({...formData, cta_link: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="/products"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  <label htmlFor="is_active">Active (visible on homepage)</label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy">
                    <Save className="h-4 w-4 inline mr-2" />
                    {editingHero ? 'Update' : 'Create'}
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

export default HeroManager;