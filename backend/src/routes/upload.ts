import express from 'express';
import multer from 'multer';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Upload customization image (public - no auth needed)
router.post('/customization', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const productId = req.body.product_id;
    
    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `customization/${productId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('giftshop')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('giftshop')
      .getPublicUrl(fileName);

    res.json({
      success: true,
      image_url: publicUrl,
      file_name: fileName
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;