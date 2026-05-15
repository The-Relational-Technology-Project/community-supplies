/**
 * Compress an image data URL to a smaller size.
 * Resizes to maxDimension and converts to JPEG at the given quality.
 */
export async function compressImage(
  dataUrl: string,
  maxDimension = 1200,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}

/**
 * Read a File object and return a compressed data URL.
 * Handles any file size — compression brings it down to ~100-300KB.
 */
export async function compressFileToDataUrl(
  file: File,
  maxDimension = 1200,
  quality = 0.7
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
  return compressImage(dataUrl, maxDimension, quality);
}

/**
 * Memory-safe compression for large phone photos.
 *
 * Avoids loading the file as a base64 string (which can crash mobile Safari
 * on 5–10 MB photos by holding the raw photo in memory three times over).
 * Uses URL.createObjectURL + canvas.toBlob to keep memory low.
 *
 * Returns a JPEG Blob suitable for upload, plus an object-URL preview that
 * can be set as `<img src=...>`. Caller is responsible for revoking the
 * preview URL when no longer needed (or letting the page unload do it).
 */
export async function compressFile(
  file: File,
  maxDimension = 1200,
  quality = 0.7
): Promise<{ blob: Blob; previewUrl: string }> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(
          new Error(
            "This photo format isn't supported in your browser. Please choose a JPEG or PNG (HEIC photos from iPhone may need to be converted first)."
          )
        );
      el.src = sourceUrl;
    });

    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.drawImage(img, 0, 0, width, height);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to compress image'))),
        'image/jpeg',
        quality
      );
    });

    return { blob, previewUrl: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
