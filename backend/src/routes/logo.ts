import express from 'express';
import { supabase, supabasePublic } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/cloudinaryUpload';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get active logo
router.get('/active', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabasePublic
      .from('logo_config')
      .select('*')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data || null);
  } catch (error: any) {
    console.error('Error fetching active logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all logos
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('logo_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching logos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload logo to Cloudinary (kept for backward compatibility)
router.post('/admin/upload-logo', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const file = req.file as any;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      url: file.path,
      public_id: file.filename
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create logo
router.post('/admin', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('logo_config')
      .insert({
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update logo
router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('logo_config')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete logo
router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('logo_config')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;