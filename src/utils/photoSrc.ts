import { staticFile } from 'remotion';

// In Remotion Studio/render: staticFile returns /photos/xxx.jpg (correct)
// In Vite/Player build: window.__REMOTION_BASE__ is set to BASE_URL (e.g. /retire/)
//   so we return /retire/photos/xxx.jpg

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
