export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const OUTPUT_SIZE = 512;

/**
 * Center-crops to a square, shrinks to 512px and re-encodes as JPEG.
 * Re-encoding also strips camera metadata such as GPS location.
 */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!AVATAR_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG or WebP image.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That image is too large. Please choose one under 8 MB.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That file could not be read as an image.');
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const size = Math.min(OUTPUT_SIZE, side);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process that image.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  );
  if (!blob) throw new Error('Could not process that image.');
  return blob;
}
