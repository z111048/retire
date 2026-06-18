import { staticFile } from 'remotion';

declare global {
  interface Window {
    __REMOTION_BASE__?: string;
  }
}

export function photoSrc(fileName: string): string {
  if (typeof window !== 'undefined' && window.__REMOTION_BASE__) {
    return window.__REMOTION_BASE__ + 'photos/' + fileName;
  }
  return staticFile('photos/' + fileName);
}

export function origPhotoSrc(fileName: string): string {
  if (typeof window !== 'undefined' && window.__REMOTION_BASE__) {
    return window.__REMOTION_BASE__ + 'photos-orig/' + fileName;
  }
  return staticFile('photos-orig/' + fileName);
}
