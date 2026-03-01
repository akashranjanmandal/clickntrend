import { v2 as cloudinary } from 'cloudinary';
import config from '../config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
  secure: true,
});

// Use type assertion to bypass TypeScript issues
export const uploadToCloudinary = (buffer: Buffer, folder: string = 'giftshop'): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Use 'any' type to bypass TypeScript checking
    const uploadStream = (cloudinary.uploader as any).upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
      },
      (error: any, result: any) => {
        if (error) reject(error);
        else resolve(result?.secure_url || '');
      }
    );
    uploadStream.end(buffer);
  });
};

export const uploadMultipleToCloudinary = async (buffers: Buffer[], folder: string = 'giftshop'): Promise<string[]> => {
  const promises = buffers.map(buffer => uploadToCloudinary(buffer, folder));
  return Promise.all(promises);
};

export default cloudinary;