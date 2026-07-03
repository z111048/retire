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
    // 網頁播放器用壓縮版（photos-orig 不隨網站發布，太大）
    return window.__REMOTION_BASE__ + 'photos/' + fileName;
  }
  return staticFile('photos-orig/' + fileName);
}

export function videoSrc(fileName: string): string {
  if (typeof window !== 'undefined' && window.__REMOTION_BASE__) {
    return window.__REMOTION_BASE__ + 'videos/' + fileName;
  }
  return staticFile('videos/' + fileName);
}
