import express from 'express';
import multer from 'multer';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import { r2 } from '../utils/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
      'video/mp4', 'video/webm', 'video/ogg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'));
    }
  },
});

router.post('/upload', requireAuth, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const isVideo = file.mimetype.startsWith('video/');
    const extension = file.originalname.split('.').pop();
    const fileName = `hero/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${extension}`;

    // ✅ Upload to R2
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    // ✅ Construct Public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    const posterUrl = isVideo
      ? publicUrl.replace(/\.\w+$/, '-poster.jpg')
      : null;

    res.json({
      success: true,
      media_url: publicUrl,
      media_type: isVideo ? 'video' : 'image',
      video_poster_url: posterUrl,
      file_name: fileName,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;