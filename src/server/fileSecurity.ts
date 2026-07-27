import path from 'path';
import crypto from 'crypto';
import { SECURITY_CONFIG } from './securityConfig.js';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  safeFileName?: string;
  mimeType?: string;
}

/**
 * Validates file extension, length, and blocks path traversal attempts.
 */
export function sanitizeFileName(originalName: string): { safeName: string; extension: string } {
  if (!originalName || typeof originalName !== 'string') {
    throw new Error('Invalid file name');
  }

  // Prevent path traversal
  const baseName = path.basename(originalName).replace(/[\/\\]/g, '');
  const cleanName = baseName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  const extMatch = cleanName.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extMatch ? extMatch[1].toLowerCase() : '';

  if (!SECURITY_CONFIG.ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    throw new Error(`File extension '.${extension}' is not permitted.`);
  }

  // Generate safe non-colliding random filename preserving safe extension
  const randomPrefix = crypto.randomBytes(12).toString('hex');
  const safeName = `${randomPrefix}.${extension}`;

  return { safeName, extension };
}

/**
 * Validates magic bytes / file signatures from base64 or Buffer content
 */
export function validateMagicBytes(buffer: Buffer | string, expectedExt: string): boolean {
  let bytes: Buffer;
  if (typeof buffer === 'string') {
    // Handle base64 string
    const base64Data = buffer.includes(',') ? buffer.split(',')[1] : buffer;
    bytes = Buffer.from(base64Data.substring(0, 64), 'base64');
  } else {
    bytes = buffer;
  }

  if (!bytes || bytes.length < 4) return false;

  const hex = bytes.toString('hex', 0, 12).toUpperCase();

  switch (expectedExt) {
    case 'pdf':
      // %PDF-
      return hex.startsWith('25504446');
    case 'png':
      // 89 50 4E 47 0D 0A 1A 0A
      return hex.startsWith('89504E47');
    case 'jpg':
    case 'jpeg':
      // FF D8 FF
      return hex.startsWith('FFD8FF');
    case 'webp':
      // RIFF ... WEBP
      return hex.startsWith('52494646') && bytes.toString('utf-8', 8, 12) === 'WEBP';
    case 'json':
    case 'txt':
    case 'csv':
    case 'log':
      // Plain text check - ensure no executable script / ELF / binary magic headers
      const isElf = hex.startsWith('7F454C46');
      const isExe = hex.startsWith('4D5A');
      const isZip = hex.startsWith('504B0304');
      return !isElf && !isExe && !isZip;
    default:
      return false;
  }
}

/**
 * Complete File Security Validator
 */
export function validateUploadedFile(
  fileName: string,
  content: string | Buffer,
  sizeBytes?: number
): FileValidationResult {
  try {
    const { safeName, extension } = sanitizeFileName(fileName);

    const actualSize = sizeBytes || (typeof content === 'string' ? Buffer.byteLength(content, 'utf-8') : content.length);
    const maxSize = extension === 'pdf' || extension === 'txt'
      ? SECURITY_CONFIG.MAX_FILE_SIZE_BYTES
      : SECURITY_CONFIG.MAX_IMAGE_SIZE_BYTES;

    if (actualSize > maxSize) {
      return {
        valid: false,
        error: `File size (${(actualSize / (1024 * 1024)).toFixed(2)}MB) exceeds maximum permitted limit (${(maxSize / (1024 * 1024)).toFixed(0)}MB).`
      };
    }

    const isValidHeader = validateMagicBytes(content, extension);
    if (!isValidHeader) {
      return {
        valid: false,
        error: `File content header signature does not match declared format '.${extension}'.`
      };
    }

    return {
      valid: true,
      safeFileName: safeName,
      mimeType: getMimeTypeFromExt(extension)
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'File security validation failed.'
    };
  }
}

function getMimeTypeFromExt(ext: string): string {
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'json': return 'application/json';
    default: return 'text/plain';
  }
}
