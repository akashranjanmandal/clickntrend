import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../utils/cloudinary';

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'giftshop',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif', 'svg'],
    transformation: [{ quality: 'auto' }]
  }
});

// File filter function
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/svg+xml'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.mimetype.startsWith('video/') && req.originalUrl?.includes('hero')) {
    cb(null, true); // Allow videos for hero section
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
  }
};

// Single file upload - 5MB limit
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB hardcoded
  fileFilter: fileFilter,
});

// Multiple file upload (max 5 files) - 5MB each
export const uploadMultiple = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB hardcoded
    files: 5 
  },
  fileFilter: fileFilter,
});