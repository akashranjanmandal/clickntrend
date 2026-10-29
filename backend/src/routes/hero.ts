import express from 'express';
import { requireAuth } from '../middleware/auth';
import { r2 } from '../utils/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../utils/db';
import { mediaUpload, readUpload, cleanupUploads, UploadError } from '../utils/uploads';

const router = express.Router();

// Image 20 MB or video 100 MB, real content checked (utils/uploads)
const upload = mediaUpload();

router.post('/upload', requireAuth, cleanupUploads, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { body, contentType, ext, isVideo } = await readUpload(req.file);
    const fileName = `hero/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: body,
        ContentType: contentType,
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

// Public: only heroes switched on in admin
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hero_content WHERE is_active = true ORDER BY display_order ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
