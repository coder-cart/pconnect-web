export interface ImageAnnotationAuthor {
  id: string;
  fullName: string;
  avatarUpdatedAt?: string | null;
}

export interface ImageAnnotation {
  id: string;
  fileId: string;
  markerNumber: number;
  xPosition: number;
  yPosition: number;
  title: string | null;
  comment: string;
  category: string | null;
  status: 'open' | 'resolved';
  createdAt: string;
  updatedAt: string;
  createdBy: ImageAnnotationAuthor;
}

export interface AnnotatableFile {
  id: string;
  fileName: string;
  mimeType: string;
  processingStatus?: string;
  originalWidth?: number | null;
  originalHeight?: number | null;
  optimizedWidth?: number | null;
  optimizedHeight?: number | null;
  hasWebp?: boolean;
  hasThumbnail?: boolean;
  annotationCount?: number;
}

export const IMAGE_ANNOTATION_ACCEPT =
  'image/png,image/jpeg,image/jpg,image/webp';

export const IMAGE_ANNOTATION_MAX_BYTES = 10 * 1024 * 1024;

export function isAnnotatableImageMime(mimeType?: string | null) {
  if (!mimeType) return false;
  return ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(
    mimeType.toLowerCase(),
  );
}

export function validateAnnotatableImageFile(file: File): string | null {
  if (!isAnnotatableImageMime(file.type)) {
    return 'Only PNG, JPG, JPEG, and WEBP images are supported';
  }
  if (file.size > IMAGE_ANNOTATION_MAX_BYTES) {
    return 'Image must be 10 MB or smaller';
  }
  return null;
}
