import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

// Simple storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'giftshop',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif', 'svg'],
    transformation: [{ quality: 'auto' }]
  } as any, // Use 'as any' to bypass type checking temporarily
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'));
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

export const uploadMultiple = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: fileFilter,
});