import {
  IMAGE_ANNOTATION_MAX_BYTES,
  isAnnotatableImageMime,
  validateAnnotatableImageFile,
} from '@/lib/image-annotations';

const MAX_IMAGE_EDGE = 2560;
const JPEG_QUALITY = 0.85;

function extensionForMime(mimeType: string) {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    default:
      return 'jpg';
  }
}

function loadImageFromBlob(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image'));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Unable to compress image'));
          return;
        }
        resolve(result);
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Downscale and recompress clipboard / chat images so they fit the 10 MB
 * upload limit while keeping quality reasonable for screenshots.
 */
export async function prepareChatImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Keep animated GIFs intact; canvas would flatten them.
  if (file.type === 'image/gif') {
    if (file.size > IMAGE_ANNOTATION_MAX_BYTES) {
      throw new Error('Image must be 10 MB or smaller');
    }
    return file;
  }

  try {
    const image = await loadImageFromBlob(file);
    const scale = Math.min(
      1,
      MAX_IMAGE_EDGE / Math.max(image.width, image.height),
    );
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const needsResize = scale < 1;
    const needsCompress = file.size > 1.5 * 1024 * 1024;

    if (!needsResize && !needsCompress && file.size <= IMAGE_ANNOTATION_MAX_BYTES) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }
    context.drawImage(image, 0, 0, width, height);

    // Prefer JPEG for large screenshots (clipboard often pastes huge PNGs).
    const outputMime =
      file.type === 'image/png' || file.type === 'image/jpeg' || !file.type
        ? 'image/jpeg'
        : file.type === 'image/webp'
          ? 'image/webp'
          : 'image/jpeg';

    let blob = await canvasToBlob(
      canvas,
      outputMime,
      outputMime === 'image/jpeg' || outputMime === 'image/webp'
        ? JPEG_QUALITY
        : undefined,
    );

    if (blob.size > IMAGE_ANNOTATION_MAX_BYTES) {
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.72);
    }

    if (blob.size > IMAGE_ANNOTATION_MAX_BYTES) {
      throw new Error('Image must be 10 MB or smaller after compression');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'screenshot';
    return new File([blob], `${baseName}.${extensionForMime(outputMime)}`, {
      type: outputMime,
      lastModified: Date.now(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('10 MB')) {
      throw error;
    }
    // Fall back to original; caller still validates size/type.
    return file;
  }
}

/**
 * Collect image files from a paste event once.
 *
 * Windows/Chrome often expose the same screenshot in both `items` and `files`
 * with different `lastModified` values — dedupe by type+size within the paste,
 * and prefer `files` when present so we do not double-attach.
 */
export function collectClipboardImageFiles(
  clipboardData: DataTransfer | null,
): File[] {
  if (!clipboardData) return [];

  const fromFiles = Array.from(clipboardData.files ?? []).filter((file) =>
    file.type.startsWith('image/'),
  );

  if (fromFiles.length > 0) {
    return dedupeClipboardImages(fromFiles);
  }

  const fromItems: File[] = [];
  for (const item of Array.from(clipboardData.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) fromItems.push(file);
    }
  }

  return dedupeClipboardImages(fromItems);
}

function dedupeClipboardImages(files: File[]) {
  const seen = new Set<string>();
  const unique: File[] = [];

  for (const file of files) {
    // lastModified is unreliable across items vs files for the same paste.
    const key = `${file.type}:${file.size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(file);
  }

  return unique;
}

export function validateChatImageFile(file: File): string | null {
  if (file.type === 'image/gif') {
    if (file.size > IMAGE_ANNOTATION_MAX_BYTES) {
      return 'Image must be 10 MB or smaller';
    }
    return null;
  }
  return validateAnnotatableImageFile(file);
}

export function screenshotFileName(index = 0) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return index > 0 ? `screenshot-${stamp}-${index + 1}.png` : `screenshot-${stamp}.png`;
}
