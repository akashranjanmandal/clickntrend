// src/types/declarations.d.ts

declare module 'cloudinary' {
  export const v2: {
    config: (options: {
      cloud_name?: string;
      api_key?: string;
      api_secret?: string;
      secure?: boolean;
    }) => void;
    uploader: {
      upload: (file: string | Buffer, options?: any) => Promise<any>;
      destroy: (publicId: string, options?: any) => Promise<any>;
    };
    image: (publicId: string, options?: any) => string;
    url: (publicId: string, options?: any) => string;
  };
  export default { v2 };
}

declare module 'multer-storage-cloudinary' {
  import { StorageEngine } from 'multer';
  
  interface CloudinaryStorageOptions {
    cloudinary: any;
    params?: any | ((req: any, file: any) => any);
    allowedFormats?: string[];
  }
  
  export class CloudinaryStorage implements StorageEngine {
    constructor(options: CloudinaryStorageOptions);
    _handleFile(req: any, file: any, cb: (error?: any, info?: any) => void): void;
    _removeFile(req: any, file: any, cb: (error?: any) => void): void;
  }
}