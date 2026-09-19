/**
 * Image Compression Utility for Fleet Management
 * Automatically compresses high-resolution camera photos (receipts & odometers)
 * before upload or storage, ensuring lightning-fast uploads even on poor cellular networks (2G/3G/4G).
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.72)
  mimeType?: string; // 'image/jpeg' or 'image/webp'
}

export interface CompressionResult {
  dataUrl: string;
  originalSize: number; // bytes
  compressedSize: number; // bytes
  savedPercentage: number; // e.g. 94.5%
  width: number;
  height: number;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function estimateBase64Size(dataUrl: string): number {
  if (!dataUrl) return 0;
  const head = dataUrl.indexOf(',');
  const str = head !== -1 ? dataUrl.substring(head + 1) : dataUrl;
  return Math.round((str.length * 3) / 4);
}

/**
 * Compresses an image dataURL, File, or Blob down to optimal dimensions and quality.
 * Preserves crisp readability of printed receipts and digital odometer numbers
 * while reducing size by 90% - 98% (typically from 5-10 MB down to 80-150 KB).
 */
export async function compressImage(
  source: string | File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    mimeType = 'image/jpeg',
  } = options;

  let initialDataUrl = '';
  let originalSize = 0;

  if (typeof source === 'string') {
    initialDataUrl = source;
    originalSize = estimateBase64Size(source);
  } else {
    originalSize = source.size;
    initialDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(source);
    });
  }

  return new Promise<CompressionResult>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Maintain aspect ratio while bounding within maxWidth & maxHeight
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          maxHeight && (height = Math.round((height * maxHeight) / height));
          height = Math.min(height, maxHeight);
        }
      }

      // Ensure minimum non-zero dimensions
      width = Math.max(1, width);
      height = Math.max(1, height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        // Fallback to original if context not available
        resolve({
          dataUrl: initialDataUrl,
          originalSize,
          compressedSize: originalSize,
          savedPercentage: 0,
          width: img.width,
          height: img.height,
        });
        return;
      }

      // Smooth bicubic resampling for sharp text & numbers
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw white background for transparent PNG/WebP conversions
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        const compressedSize = estimateBase64Size(compressedDataUrl);
        const savedBytes = Math.max(0, originalSize - compressedSize);
        const savedPercentage =
          originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

        resolve({
          dataUrl: compressedDataUrl,
          originalSize,
          compressedSize,
          savedPercentage,
          width,
          height,
        });
      } catch (err) {
        console.warn('Canvas toDataURL failed, using fallback:', err);
        resolve({
          dataUrl: initialDataUrl,
          originalSize,
          compressedSize: originalSize,
          savedPercentage: 0,
          width,
          height,
        });
      }
    };

    img.onerror = (err) => {
      console.warn('Image load failed during compression:', err);
      resolve({
        dataUrl: initialDataUrl,
        originalSize,
        compressedSize: originalSize,
        savedPercentage: 0,
        width: 0,
        height: 0,
      });
    };

    img.src = initialDataUrl;
  });
}
