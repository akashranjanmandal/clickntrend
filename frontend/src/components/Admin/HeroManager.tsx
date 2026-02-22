import React, { useState, useEffect } from 'react';
import {
  X, Plus, Save, Trash2, Edit, Search, RefreshCw,
  MoveUp, MoveDown, Eye, EyeOff, Video, Image,
  Upload, FileUp, Play, Pause, Volume2, VolumeX
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    media_type: 'image' as 'image' | 'video',
    media_url: '',
    video_poster_url: '',
    media_file: null as File | null,
    poster_file: null as File | null,
    autoplay: true,
    loop: true,
    muted: true,
    cta_text: '',
    cta_link: '',
    is_active: true,
    display_order: 0,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchHeroes();
  }, []);

  const fetchHeroes = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/api/hero/admin');
      setHeroes(data.sort((a: HeroContent, b: HeroContent) => a.display_order - b.display_order));
    } catch (error) {
      console.error('Error fetching heroes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (file: File, type: 'media' | 'poster'): Promise<string | null> => {
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('media', file);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/hero/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      if (type === 'media') {
        setFormData(prev => ({ 
          ...prev, 
          media_url: data.media_url,
          media_type: data.media_type 
        }));
      } else {
        setFormData(prev => ({ ...prev, video_poster_url: data.media_url }));
      }

      return data.media_url;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'media' | 'poster') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'media') {
        setFormData({ ...formData, media_file: file });
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setFormData({ ...formData, poster_file: file });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let mediaUrl = formData.media_url;
      let posterUrl = formData.video_poster_url;

      // Upload media file if selected
      if (formData.media_file) {
        const uploadedUrl = await handleMediaUpload(formData.media_file, 'media');
        if (uploadedUrl) mediaUrl = uploadedUrl;
      }

      // Upload poster if selected
      if (formData.poster_file) {
        const uploadedUrl = await handleMediaUpload(formData.poster_file, 'poster');
        if (uploadedUrl) posterUrl = uploadedUrl;
      }

      const heroData = {
        title: formData.title,
        subtitle: formData.subtitle,
        media_type: formData.media_type,
        media_url: mediaUrl,
        video_poster_url: posterUrl,
        autoplay: formData.autoplay,
        loop: formData.loop,
        muted: formData.muted,
        cta_text: formData.cta_text,
        cta_link: formData.cta_link,
        is_active: formData.is_active,
        display_order: formData.display_order,
      };

      if (editingHero) {
        await fetchWithAuth(`/api/hero/admin/${editingHero.id}`, {
          method: 'PUT',
          body: JSON.stringify(heroData),
        });
      } else {
        await fetchWithAuth('/api/hero/admin', {
          method: 'POST',
          body: JSON.stringify(heroData),
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

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      media_type: 'image',
      media_url: '',
      video_poster_url: '',
      media_file: null,
      poster_file: null,
      autoplay: true,
      loop: true,
      muted: true,
      cta_text: '',
      cta_link: '',
      is_active: true,
      display_order: heroes.length,
    });
    setPreviewUrl(null);
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
          <h2 className="text-2xl font-serif font-semibold">Hero Sections</h2>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-premium-gold text-white rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Add Hero
          </button>
        </div>
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-semibold">
                  {editingHero ? 'Edit Hero' : 'Add Hero'}
                </h2>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
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

                {/* Media Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Media (Image/Video)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {previewUrl ? (
                      <div className="relative">
                        {formData.media_type === 'video' ? (
                          <video src={previewUrl} className="max-h-48 mx-auto" controls />
                        ) : (
                          <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto" />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(null);
                            setFormData({...formData, media_file: null, media_url: ''});
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload image or video</p>
                        <p className="text-xs text-gray-500">MP4, WebM, JPEG, PNG up to 50MB</p>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => handleFileChange(e, 'media')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  {uploading && (
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-premium-gold transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                </div>

                {/* Video Options */}
                {formData.media_type === 'video' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Video Poster (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'poster')}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.autoplay}
                          onChange={(e) => setFormData({...formData, autoplay: e.target.checked})}
                        />
                        Autoplay
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
                        Muted
                      </label>
                    </div>
                  </>
                )}

                {/* CTA */}
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
                      type="text"
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
                    Save
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