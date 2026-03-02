import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

/* ===============================
   MULTER CONFIG
================================ */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
      'video/mp4',
      'video/webm',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/* ===============================
   RATE LIMITERS
================================ */
const customizationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 uploads per IP
  standardHeaders: true,
  legacyHeaders: false,
});

/* ===============================
   PRODUCT IMAGES UPLOAD (AUTH)
================================ */
router.post(
  '/product-images',
  requireAuth,
  upload.array('images', 5),
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploads = await Promise.all(
        files.map(async (file, index) => {
          const ext = file.mimetype.split('/')[1];
          const fileName = `products/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;

          const { error } = await supabase.storage
            .from('giftshop')
            .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
            });

          if (error) throw error;

          const { data } = supabase.storage
            .from('giftshop')
            .getPublicUrl(fileName);

          return {
            url: data.publicUrl,
            filename: fileName,
            is_primary: index === 0,
          };
        })
      );

      res.json({ success: true, images: uploads });
    } catch (err: any) {
      console.error('Product upload error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ===============================
   CUSTOMIZATION IMAGE (NO AUTH)
================================ */
router.post(
  '/customization',
  customizationLimiter,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.is('multipart/form-data')) {
        return res
          .status(415)
          .json({ error: 'Content-Type must be multipart/form-data' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
      }

      if (!req.body.product_id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      const file = req.file;
      const productId = req.body.product_id;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Unsupported image type' });
      }

      const ext = file.mimetype.split('/')[1];
      const fileName = `customizations/${productId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('giftshop')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('giftshop')
        .getPublicUrl(fileName);

      res.json({
        success: true,
        image_url: data.publicUrl,
      });
    } catch (err: any) {
      console.error('Customization upload error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ===============================
   HERO MEDIA UPLOAD (AUTH)
================================ */
router.post(
  '/hero',
  requireAuth,
  upload.single('media'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const ext = file.mimetype.split('/')[1];
      const isVideo = file.mimetype.startsWith('video/');
      const fileName = `hero/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('giftshop')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('giftshop')
        .getPublicUrl(fileName);

      res.json({
        success: true,
        media_url: data.publicUrl,
        media_type: isVideo ? 'video' : 'image',
      });
    } catch (err: any) {
      console.error('Hero upload error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;