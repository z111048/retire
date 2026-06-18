import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';
import { RetirementVideo } from './RetirementVideo';
import type { Timeline, Copywriting } from './types';
import { FRAME_RATE } from './constants';

// Load data at build time via Vite's JSON import
import timelineData from '../data/timeline.json';
import copywritingData from '../data/copywriting.json';

const timeline = timelineData as unknown as Timeline;
const copywriting = copywritingData as unknown as Copywriting;

const totalFrames = Math.max(
  Math.ceil(timeline.totalDuration * FRAME_RATE),
  FRAME_RATE * 5
);

// In Vite, import.meta.env.BASE_URL is the base path (e.g. '/retire/')
const BASE = import.meta.env.BASE_URL;

// Inject base path so photoSrc() helper can resolve correct URLs in the Player
window.__REMOTION_BASE__ = BASE;

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Preload a couple of images to confirm paths work
    const img = new Image();
    img.src = `${BASE}photos/cover.jpg`;
    img.onload = () => setReady(true);
    img.onerror = () => setReady(true); // show player even if cover fails
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
    }}>
      <h1 style={{ color: '#F5E6C8', fontSize: 22, marginBottom: 8, letterSpacing: '0.1em' }}>
        高雄市政府都市發展局
      </h1>
      <h2 style={{ color: '#C9A84C', fontSize: 18, marginBottom: 24, fontWeight: 400, letterSpacing: '0.12em' }}>
        秀燕 榮退紀念影片
      </h2>

      {ready && (
        <div style={{ width: '100%', maxWidth: 960, aspectRatio: '16/9' }}>
          <Player
            component={RetirementVideo}
            inputProps={{ timeline, copywriting }}
            durationInFrames={totalFrames}
            fps={FRAME_RATE}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }}
            controls
            autoPlay={false}
            loop={false}
          />
        </div>
      )}

      <p style={{ color: '#666', fontSize: 13, marginTop: 16 }}>
        影片長度：約 {Math.floor(timeline.totalDuration / 60)} 分 {Math.round(timeline.totalDuration % 60)} 秒 · {timeline.sections.reduce((s, sec) => s + sec.photos.length, 0)} 張照片
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
