import express from 'express';
import { supabase, supabasePublic } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/cloudinaryUpload';

const router = express.Router();

console.log('✅ hero routes loaded');

// ========== PUBLIC ROUTES ==========

// Get active hero sections
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('hero_content')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get public hero sections (alias)
router.get('/public', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('hero_content')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========== HERO MEDIA UPLOAD ==========
router.post('/upload', requireAuth, upload.single('media'), async (req, res) => {
  try {
    const file = req.file as any;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if it's video based on mimetype
    const isVideo = file.mimetype?.startsWith('video/');

    res.json({
      success: true,
      media_url: file.path,
      media_type: isVideo ? 'video' : 'image',
      public_id: file.filename
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all hero sections (admin)
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hero_content')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create hero section
router.post('/admin', requireAuth, async (req, res) => {
  try {
    const heroData = req.body;
    
    const { data, error } = await supabase
      .from('hero_content')
      .insert({
        ...heroData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating hero:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update hero section
router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('hero_content')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating hero:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete hero section
router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('hero_content')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting hero:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;