import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';
import config from '../config';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine folder based on the route
    let folder = 'giftshop';
    const url = req.originalUrl || '';
    
    if (url.includes('product-images')) {
      folder = 'giftshop/products';
    } else if (url.includes('customization')) {
      folder = 'giftshop/customizations';
    } else if (url.includes('hero')) {
      folder = 'giftshop/hero';
    } else if (url.includes('logo')) {
      folder = 'giftshop/logos';
    } else if (url.includes('upload-image')) {
      folder = 'giftshop/general';
    }

    return {
      folder: folder,
      format: file.mimetype.split('/')[1],
      public_id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ],
    };
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (config.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.mimetype.startsWith('video/') && req.originalUrl.includes('hero')) {
    cb(null, true); // Allow videos for hero section
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: fileFilter,
});

// For multiple file uploads
export const uploadMultiple = multer({
  storage: storage,
  limits: { fileSize: config.maxFileSize, files: 5 },
  fileFilter: fileFilter,
});