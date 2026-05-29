import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2 } from "../utils/r2";

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { 
    fileSize: 50* 1024 * 1024, // 10MB (increased from 5MB)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Configure specialized multer for hero uploads (images and videos)
const heroUpload = multer({
  storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

// ========== PRODUCT IMAGES UPLOAD ==========
router.post('/product-images', requireAuth, upload.array('images', 5), async (req, res) => {
  console.log('📸 POST /api/upload/product-images - Uploading product images');
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadPromises = files.map(async (file, index) => {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

      return {
        url: publicUrl,
        filename: fileName,
        is_primary: index === 0
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);
    res.json({ success: true, images: uploadedImages });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== CUSTOMIZATION IMAGE UPLOAD (Single) ==========
router.post('/customization', upload.single('image'), async (req, res) => {
  console.log('🎨 POST /api/upload/customization - Uploading customization image');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const productId = req.body.product_id || 'temp';
    const index = req.body.index || '0';
    
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `customizations/${productId}/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    console.log('✅ Customization image uploaded:', publicUrl);
    res.json({ success: true, image_url: publicUrl });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== CUSTOMIZATION IMAGES UPLOAD (Multiple) ==========
router.post('/customizations', upload.array('images', 20), async (req, res) => {
  console.log('🎨 POST /api/upload/customizations - Uploading multiple customization images');
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const productId = req.body.product_id || 'temp';
    const uploadedUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `customizations/${productId}/${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
      uploadedUrls.push(publicUrl);
    }

    console.log(`✅ ${uploadedUrls.length} customization images uploaded`);
    res.json({ success: true, image_urls: uploadedUrls });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== HERO MEDIA UPLOAD ==========
router.post('/hero', requireAuth, heroUpload.single('media'), async (req, res) => {
  console.log('🎬 POST /api/upload/hero - Uploading hero media');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const isVideo = file.mimetype.startsWith('video/');
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `hero/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    res.json({ 
      success: true, 
      media_url: publicUrl, 
      media_type: isVideo ? 'video' : 'image' 
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});
// ========== SINGLE IMAGE UPLOAD (for colors and main images) ==========
router.post('/upload-image', requireAuth, upload.single('image'), async (req, res) => {
  console.log('📸 POST /api/upload/upload-image - Uploading single image');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    res.json({
      success: true,
      image_url: publicUrl,
      file_name: fileName,
      message: 'Image uploaded successfully'
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload image'
    });
  }
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