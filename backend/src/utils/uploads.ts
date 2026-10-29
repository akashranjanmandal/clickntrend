import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';

/**
 * Shared upload rules for every route:
 *  - each image up to 20 MB (multi-image uploads: 20 MB per image, not in total)
 *  - videos up to 100 MB
 *  - files are buffered on disk (not RAM) and always deleted after the request
 *  - the stored extension comes from the real file content, never the client's file name
 */
const MB = 1024 * 1024;
export const IMAGE_MAX_BYTES = 20 * MB;
export const VIDEO_MAX_BYTES = 100 * MB;

const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
};
const VIDEO_EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

export class UploadError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (_req, _file, cb) => cb(null, `gftd-upload-${crypto.randomUUID()}`),
});

/** Images only, 20 MB each. `maxFiles` caps how many one request may carry. */
export const imageUpload = (maxFiles = 1) => multer({
  storage,
  limits: { fileSize: IMAGE_MAX_BYTES, files: maxFiles },
  fileFilter: (_req, file, cb) =>
    IMAGE_EXT[file.mimetype] ? cb(null, true) : cb(new UploadError('Only JPG, PNG, WebP or GIF images are allowed.')),
});

const LOGO_EXT: Record<string, string> = { ...IMAGE_EXT, 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico' };

/** Logo / favicon images (also SVG and ICO), 20 MB, admin only */
export const logoUpload = () => multer({
  storage,
  limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) =>
    LOGO_EXT[file.mimetype] ? cb(null, true) : cb(new UploadError('Only JPG, PNG, WebP, GIF, SVG or ICO files are allowed.')),
});

/** One image (20 MB) or one video (100 MB) — e.g. hero media */
export const mediaUpload = () => multer({
  storage,
  limits: { fileSize: VIDEO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) =>
    IMAGE_EXT[file.mimetype] || VIDEO_EXT[file.mimetype]
      ? cb(null, true)
      : cb(new UploadError('Only images (JPG, PNG, WebP, GIF) or videos (MP4, WebM, MOV) are allowed.')),
});

const startsWith = (buf: Buffer, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);

/** Detects the real file type from its first bytes (the browser-reported type can be faked) */
function sniff(head: Buffer): string | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (startsWith(head, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (startsWith(head, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (head.toString('ascii', 4, 8) === 'ftyp') return head.toString('ascii', 8, 10) === 'qt' ? 'video/quicktime' : 'video/mp4';
  return null;
}

function sniffLogo(body: Buffer): string | null {
  if (startsWith(body, [0x00, 0x00, 0x01, 0x00])) return 'image/x-icon';
  const text = body.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  if (text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg'))) return 'image/svg+xml';
  return null;
}

/**
 * Reads an uploaded file after checking its real content and size limits.
 * Returns the bytes plus the content type and extension to store it under.
 */
export async function readUpload(file: Express.Multer.File, opts: { allowLogoFormats?: boolean } = {}): Promise<{ body: Buffer; contentType: string; ext: string; isVideo: boolean }> {
  const body = await fs.promises.readFile(file.path);
  const logoType = opts.allowLogoFormats ? sniffLogo(body) : null;
  if (logoType) {
    if (body.length > IMAGE_MAX_BYTES) throw new UploadError('Images must be 20 MB or smaller.', 413);
    return { body, contentType: logoType, ext: LOGO_EXT[logoType], isVideo: false };
  }
  const detected = sniff(body.subarray(0, 16));
  if (!detected) throw new UploadError(`"${file.originalname}" is not a valid image or video file.`);
  const isVideo = detected.startsWith('video/');
  if (!isVideo && body.length > IMAGE_MAX_BYTES) throw new UploadError('Images must be 20 MB or smaller.', 413);
  if (isVideo && !VIDEO_EXT[file.mimetype]) throw new UploadError('Videos are not allowed here.');
  if (!isVideo && !IMAGE_EXT[file.mimetype]) throw new UploadError('Images are not allowed here.');
  return { body, contentType: detected, ext: IMAGE_EXT[detected] || VIDEO_EXT[detected], isVideo };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Folder name for customer uploads: a real product id, or "temp" — never arbitrary text */
export const safeFolder = (raw: any) => (typeof raw === 'string' && UUID_RE.test(raw) ? raw.toLowerCase() : 'temp');

/** Deletes temp upload files once the response is finished (success or error) */
export function cleanupUploads(req: Request, res: Response, next: NextFunction) {
  const remove = () => {
    const files: Express.Multer.File[] = [];
    if ((req as any).file) files.push((req as any).file);
    const many = (req as any).files;
    if (Array.isArray(many)) files.push(...many);
    else if (many && typeof many === 'object') Object.values(many).forEach((list: any) => files.push(...list));
    files.forEach(f => f?.path && fs.promises.unlink(f.path).catch(() => {}));
  };
  res.on('finish', remove);
  res.on('close', remove);
  next();
}

/** Turns multer/upload errors into clear JSON responses */
export function uploadErrorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large: images up to 20 MB, videos up to 100 MB.'
      : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Too many files in one upload.'
      : 'Upload failed.';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: message });
  }
  if (err instanceof UploadError) return res.status(err.status).json({ error: err.message });
  next(err);
}
