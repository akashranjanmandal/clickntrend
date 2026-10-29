import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import { r2 } from '../utils/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { buildUpdate, buildInsert, LOGO_FIELDS } from '../utils/sqlUpdate';
import { logoUpload, readUpload, cleanupUploads, UploadError } from '../utils/uploads';

const router = express.Router();

// Logo / favicon (incl. SVG, ICO), 20 MB, real content checked (utils/uploads)
const upload = logoUpload();

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
router.post('/admin/upload-logo', requireAuth, cleanupUploads, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { body, contentType, ext } = await readUpload(req.file, { allowLogoFormats: true });
    const type = req.body.type === 'favicon' ? 'favicon' : 'logo'; // folder is never taken as free text
    const fileName = `logos/${type}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: body,
        ContentType: contentType,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    res.json({ success: true, url: publicUrl, file_name: fileName, file_type: contentType });
  } catch (error: any) {
    if (error instanceof UploadError) return res.status(error.status).json({ error: error.message });
    console.error('❌ Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Create logo record
router.post('/admin', requireAuth, async (req, res) => {
  try {
    const now = new Date().toISOString();
    // Only real logo_config columns from the client; server-set values always win
    const insert = buildInsert(req.body, LOGO_FIELDS, { created_at: now, updated_at: now });
    if (!insert) return res.status(400).json({ error: 'No fields provided' });

    const result = await pool.query(
      `INSERT INTO logo_config (${insert.columns}) VALUES (${insert.placeholders}) RETURNING *`,
      insert.values
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
    // Only real logo_config columns are written; unknown keys are ignored
    const update = buildUpdate(req.body, LOGO_FIELDS, { extra: ['updated_at = NOW()'] });
    if (!update) return res.status(400).json({ error: 'Nothing to update' });

    const result = await pool.query(
      `UPDATE logo_config SET ${update.setClause} WHERE id = $${update.values.length + 1} RETURNING *`,
      [...update.values, id]
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
