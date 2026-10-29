import express from 'express';
import { requireAuth } from '../middleware/auth';
import { PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2 } from "../utils/r2";
import { imageUpload, mediaUpload, readUpload, safeFolder, cleanupUploads, UploadError } from '../utils/uploads';

const router = express.Router();
router.use(cleanupUploads); // temp files are removed after every request

const randomName = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

/** Checks the file's real content, stores it in R2 and returns its public URL */
async function store(file: Express.Multer.File, folder: string) {
  const { body, contentType, ext, isVideo } = await readUpload(file);
  const key = `${folder}/${randomName()}.${ext}`;
  await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: body, ContentType: contentType }));
  return { url: `${process.env.R2_PUBLIC_URL}/${key}`, key, isVideo };
}

const fail = (res: express.Response, error: any, fallback = 'Upload failed. Please try again.') => {
  if (error instanceof UploadError) return res.status(error.status).json({ error: error.message });
  console.error('❌ Upload error:', error);
  res.status(500).json({ error: fallback });
};

// ========== PRODUCT IMAGES UPLOAD (admin, up to 5 images × 20 MB) ==========
router.post('/product-images', requireAuth, imageUpload(5).array('images', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    const images = [];
    for (let i = 0; i < files.length; i++) {
      const { url, key } = await store(files[i], 'products');
      images.push({ url, filename: key, is_primary: i === 0 });
    }
    res.json({ success: true, images });
  } catch (error: any) { fail(res, error); }
});

// ========== CUSTOMIZATION IMAGE UPLOAD (customers, 1 image × 20 MB) ==========
router.post('/customization', imageUpload(1).single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { url } = await store(req.file, `customizations/${safeFolder(req.body.product_id)}`);
    res.json({ success: true, image_url: url });
  } catch (error: any) { fail(res, error); }
});

// ========== CUSTOMIZATION IMAGES UPLOAD (customers, up to 20 images × 20 MB each) ==========
router.post('/customizations', imageUpload(20).array('images', 20), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    const folder = `customizations/${safeFolder(req.body.product_id)}`;
    const image_urls: string[] = [];
    for (const file of files) image_urls.push((await store(file, folder)).url); // one at a time keeps memory low
    res.json({ success: true, image_urls });
  } catch (error: any) { fail(res, error); }
});

// ========== HERO MEDIA UPLOAD (admin, image 20 MB or video 100 MB) ==========
router.post('/hero', requireAuth, mediaUpload().single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { url, isVideo } = await store(req.file, 'hero');
    res.json({ success: true, media_url: url, media_type: isVideo ? 'video' : 'image' });
  } catch (error: any) { fail(res, error); }
});

// ========== SINGLE IMAGE UPLOAD (admin: colors and main images, 20 MB) ==========
router.post('/upload-image', requireAuth, imageUpload(1).single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { url, key } = await store(req.file, 'products');
    res.json({ success: true, image_url: url, file_name: key, message: 'Image uploaded successfully' });
  } catch (error: any) { fail(res, error, 'Failed to upload image'); }
});

// ========== LIST FILES IN BUCKET ==========
router.get('/list-files', requireAuth, async (req, res) => {
  try {
    const prefix = (req.query.prefix as string) || '';
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 500,
    });
    const data = await r2.send(command);
    const files = (data.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `${process.env.R2_PUBLIC_URL}/${obj.Key}`,
    }));
    res.json({ files });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== DELETE FILES FROM BUCKET ==========
router.delete('/delete-files', requireAuth, async (req, res) => {
  try {
    const { keys } = req.body as { keys: string[] };
    if (!keys || keys.length === 0) {
      return res.status(400).json({ error: 'No keys provided' });
    }
    if (keys.length === 1) {
      await r2.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: keys[0],
      }));
    } else {
      await r2.send(new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: { Objects: keys.map(k => ({ Key: k })) },
      }));
    }
    res.json({ success: true, deleted: keys.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;