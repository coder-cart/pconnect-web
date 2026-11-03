export type CropAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropExportOptions = {
  fileName?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
  /** Canvas fill before draw. Use white for JPEG so transparent pixels are not black. */
  backgroundColor?: string | null;
};

const MAX_OUTPUT_EDGE = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = src;
  });
}

function outputSize(crop: CropAreaPixels): { width: number; height: number } {
  const sourceWidth = Math.max(1, Math.round(crop.width));
  const sourceHeight = Math.max(1, Math.round(crop.height));
  const longest = Math.max(sourceWidth, sourceHeight);
  if (longest <= MAX_OUTPUT_EDGE) {
    return { width: sourceWidth, height: sourceHeight };
  }
  const scale = MAX_OUTPUT_EDGE / longest;
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    default:
      return 'jpg';
  }
}

/**
 * Crops the source image to the given pixel area and returns an image File.
 * Preserves the crop aspect ratio (square or horizontal).
 */
export async function getCroppedImageFile(
  imageSrc: string,
  crop: CropAreaPixels,
  fileNameOrOptions: string | CropExportOptions = 'cropped.jpg',
  mimeTypeArg: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  qualityArg = 0.92,
): Promise<File> {
  const options: CropExportOptions =
    typeof fileNameOrOptions === 'string'
      ? {
          fileName: fileNameOrOptions,
          mimeType: mimeTypeArg,
          quality: qualityArg,
        }
      : fileNameOrOptions;

  const mimeType = options.mimeType ?? 'image/jpeg';
  const quality = options.quality ?? 0.92;
  const backgroundColor =
    options.backgroundColor === undefined
      ? mimeType === 'image/jpeg'
        ? '#ffffff'
        : null
      : options.backgroundColor;
  const fileName =
    options.fileName ?? `cropped.${extensionForMime(mimeType)}`;

  const image = await loadImage(imageSrc);
  const { width, height } = outputSize(crop);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to crop this image');
  }

  if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  } else {
    context.clearRect(0, 0, width, height);
  }

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Unable to export the cropped image'));
          return;
        }
        resolve(result);
      },
      mimeType,
      quality,
    );
  });

  return new File([blob], fileName, { type: mimeType });
}
