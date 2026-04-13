import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { r2 } from '../utils/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../utils/db';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isImage || isVideo) cb(null, true);
    else cb(new Error('Invalid file type.'));
  },
});

router.post('/upload', requireAuth, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const isVideo = file.mimetype.startsWith('video/');
    const extension = file.originalname.split('.').pop();
    const fileName = `hero/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    const posterUrl = isVideo ? publicUrl.replace(/\.\w+$/, '-poster.jpg') : null;

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

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hero_content ORDER BY display_order ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
