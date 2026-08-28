/**
 * Downscale invoice page photos before upload.
 *
 * A counter phone shoots 12 MP (3–8 MB) images. Printed invoice text stays
 * legible around 1800px on the long edge, so shrinking first removes most of
 * the upload wait on a pharmacy's connection and keeps the Gemini call smaller.
 */

const MAX_EDGE = 1800;
const QUALITY = 0.8;
/** Below this, re-encoding costs more than it saves. */
const SKIP_BELOW_BYTES = 320 * 1024;

function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    img.src = url;
  });
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => {
    if (canvas.convertToBlob) {
      canvas.convertToBlob({ type: 'image/jpeg', quality }).then(resolve, () => resolve(null));
      return;
    }
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

function makeCanvas(width, height) {
  if (typeof OffscreenCanvas === 'function') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * @returns {Promise<File>} the shrunk JPEG, or the original file if shrinking
 * would not help or is unsupported by the browser.
 */
export async function compressInvoicePage(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  if (!file || !file.type?.startsWith('image/')) return file;
  if (file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await loadBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    const longest = Math.max(width, height);
    if (!longest) return file;

    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = makeCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Flatten transparency so PNG screenshots keep dark text on white.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob = await toBlob(canvas, quality);
    if (!blob || blob.size >= file.size) return file;

    const name = file.name?.replace(/\.[^.]+$/, '') || 'invoice-page';
    return new File([blob], `${name}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
