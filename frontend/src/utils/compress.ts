import imageCompression from 'browser-image-compression';

const MAX_EDGE_PX = 1600;
const MAX_SIZE_MB = 1;
const QUALITY = 0.8;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export async function compressMenuImage(file: File): Promise<File> {
  const size = await readImageSize(file);
  if (
    file.size <= MAX_SIZE_BYTES &&
    Math.max(size.width, size.height) <= MAX_EDGE_PX
  ) {
    return file;
  }

  const compressed = await imageCompression(file, {
    maxWidthOrHeight: MAX_EDGE_PX,
    maxSizeMB: MAX_SIZE_MB,
    initialQuality: QUALITY,
    useWebWorker: true,
    fileType: file.type || 'image/jpeg',
  });

  return new File([compressed], file.name, {
    type: compressed.type || file.type || 'image/jpeg',
    lastModified: Date.now(),
  });
}

export async function compressMenuImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressMenuImage(file)));
}
