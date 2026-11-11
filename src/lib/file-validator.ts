import crypto from 'crypto';

export interface FileValidationResult {
  valid: boolean;
  detectedType?: string;
  sha256?: string;
  sanitizedFilename?: string;
  error?: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB strict ceiling

/**
 * Validates file buffer magic bytes to ensure the content matches allowed formats
 */
export function validateFileBuffer(
  buffer: Buffer,
  originalFilename: string
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File payload is empty' };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds maximum allowed size of 2MB (received ${(buffer.length / 1024 / 1024).toFixed(2)}MB)` };
  }

  // Magic byte checks
  let detectedType: string | null = null;
  let extension: string = '.bin';

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    detectedType = 'application/pdf';
    extension = '.pdf';
  }
  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedType = 'image/png';
    extension = '.png';
  }
  // JSON: Starts with { or [ (after trimming whitespace)
  else {
    const preview = buffer.subarray(0, 32).toString('utf-8').trim();
    if (preview.startsWith('{') || preview.startsWith('[')) {
      try {
        JSON.parse(buffer.toString('utf-8'));
        detectedType = 'application/json';
        extension = '.json';
      } catch {
        // Not valid JSON
      }
    }
  }

  if (!detectedType) {
    return {
      valid: false,
      error: 'Invalid file signature: Only certified PDF, PNG, or JSON deliverable proofs are permitted.',
    };
  }

  // Prevent path traversal by discarding original name and generating randomized UUID
  const randomId = crypto.randomUUID();
  const sanitizedFilename = `proof_${randomId}${extension}`;

  // Compute cryptographic SHA-256 digest
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    valid: true,
    detectedType,
    sha256,
    sanitizedFilename,
  };
}
