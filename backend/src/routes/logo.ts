import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';
import { r2 } from '../utils/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
      'image/svg+xml', 'image/x-icon', 'image/gif',
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only images and GIFs are allowed.'));
  },
});

// ========== PUBLIC ROUTES ==========

// Get active logo
router.get('/active', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      `SELECT * FROM logo_config
       WHERE is_active = true
         AND (start_date IS NULL OR start_date <= $1)
         AND (end_date   IS NULL OR end_date   >= $1)
       ORDER BY created_at DESC
       LIMIT 1`,
      [now]
    );
    res.json(result.rows[0] || null);
  } catch (error: any) {
    console.error('Error fetching active logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all logos
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM logo_config ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching logos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload logo file to R2
router.post('/admin/upload-logo', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const type = req.body.type || 'logo';
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `logos/${type}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    res.json({ success: true, url: publicUrl, file_name: fileName, file_type: file.mimetype });
  } catch (error: any) {
    console.error('❌ Logo upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create logo record
router.post('/admin', requireAuth, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const body = { ...req.body, created_at: now, updated_at: now };
    const keys = Object.keys(body);
    const values = Object.values(body);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await pool.query(
      `INSERT INTO logo_config (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update logo record
router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE logo_config SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete logo record
router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM logo_config WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
