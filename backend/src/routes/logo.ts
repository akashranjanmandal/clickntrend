import express from 'express';
import { supabase, supabasePublic } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';
import { r2 } from '../utils/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Increased to 5MB for GIFs
  fileFilter: (req, file, cb) => {
    // Added 'image/gif' to allowed types
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'image/jpg', 
      'image/svg+xml', 
      'image/x-icon',
      'image/gif'  // Added GIF support
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and GIFs are allowed.'));
    }
  },
});

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

// Upload logo
router.post('/admin/upload-logo', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const type = req.body.type || 'logo';

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `logos/${type}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExtension}`;

    console.log('Uploading logo to R2:', fileName);

    // ✅ Upload to R2
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    // ✅ Generate Public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    res.json({
      success: true,
      url: publicUrl,
      file_name: fileName,
      file_type: file.mimetype
    });

  } catch (error: any) {
    console.error('❌ Logo upload error:', error);
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