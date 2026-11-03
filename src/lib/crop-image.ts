export type CropAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
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

/**
 * Crops the source image to the given pixel area and returns an image File.
 * Preserves the crop aspect ratio (square or horizontal).
 */
export async function getCroppedImageFile(
  imageSrc: string,
  crop: CropAreaPixels,
  fileName = 'cropped.jpg',
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  quality = 0.92,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const { width, height } = outputSize(crop);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to crop this image');
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
