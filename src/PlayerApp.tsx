import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';
import { RetirementVideo } from './RetirementVideo';
import type { Timeline, Copywriting } from './types';
import { FRAME_RATE, CREDITS_START_S, CREDITS_DURATION_S } from './constants';
import { loadCustomFonts } from './utils/fonts';

import timelineData from '../data/timeline.json';
import copywritingData from '../data/copywriting.json';

const timeline = timelineData as unknown as Timeline;
const copywriting = copywritingData as unknown as Copywriting;

// Credits 疊在絕對時間點播放（見 constants.ts CREDITS_START_S），不是接在內容之後
const creditsEndS = copywriting.credits ? CREDITS_START_S + CREDITS_DURATION_S : 0;
const totalFrames = Math.max(
  Math.ceil(timeline.totalDuration * FRAME_RATE),
  Math.ceil(creditsEndS * FRAME_RATE),
  FRAME_RATE * 5
);

const BASE = import.meta.env.BASE_URL;
window.__REMOTION_BASE__ = BASE;

// 載入影片用的開源字體（辰宇落雁體、霞鶩文楷 TC）
loadCustomFonts();

const totalPhotos = timeline.sections.reduce((s, sec) => s + sec.photos.length, 0);
const durationMin = Math.floor(timeline.totalDuration / 60);
const durationSec = Math.round(timeline.totalDuration % 60);

function App() {
  const [ready, setReady] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = `${BASE}photos/cover-wide.jpg`;
    img.onload = () => setReady(true);
    img.onerror = () => setReady(true);
  }, []);

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        padding: isPortrait ? '20px 16px 12px' : '24px 24px 12px',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, #1a1208, #111)',
      }}>
        <p style={{
          color: '#C9A84C',
          fontSize: isPortrait ? 12 : 14,
          letterSpacing: '0.18em',
          margin: '0 0 6px',
          fontWeight: 400,
          opacity: 0.9,
        }}>
          高雄市政府都市發展局
        </p>
        <h1 style={{
          color: '#F5E6C8',
          fontSize: isPortrait ? 22 : 28,
          fontWeight: 700,
          margin: '0 0 4px',
          letterSpacing: '0.15em',
          lineHeight: 1.3,
        }}>
          秀燕 榮退紀念
        </h1>
        <p style={{
          color: '#888',
          fontSize: isPortrait ? 11 : 13,
          margin: 0,
          letterSpacing: '0.08em',
        }}>
          {durationMin} 分 {durationSec} 秒 · {totalPhotos} 張珍貴回憶
        </p>
      </div>

      {/* Player area */}
      <div style={{
        width: '100%',
        flex: 1,
        display: 'flex',
        alignItems: isPortrait ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isPortrait ? '0' : '16px 24px',
      }}>
        {ready ? (
          <div style={{
            width: '100%',
            maxWidth: isPortrait ? '100%' : 900,
            // Maintain 16:9 aspect ratio
            aspectRatio: '16/9',
            borderRadius: isPortrait ? 0 : 10,
            overflow: 'hidden',
            boxShadow: isPortrait ? 'none' : '0 8px 48px rgba(0,0,0,0.6)',
            backgroundColor: '#000',
          }}>
            <Player
              component={RetirementVideo}
              inputProps={{ timeline, copywriting, audioSrc: BASE + 'bgm.mp3' }}
              durationInFrames={totalFrames}
              fps={FRAME_RATE}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{ width: '100%', height: '100%', display: 'block' }}
              controls
              autoPlay={false}
              loop={false}
            />
          </div>
        ) : (
          <div style={{
            width: '100%',
            maxWidth: 900,
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            borderRadius: isPortrait ? 0 : 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 40,
                height: 40,
                border: '3px solid #C9A84C',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ color: '#666', fontSize: 13, margin: 0 }}>載入中…</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: isPortrait ? '12px 16px 24px' : '16px 24px 20px',
        textAlign: 'center',
        width: '100%',
      }}>
        <p style={{
          color: '#444',
          fontSize: isPortrait ? 11 : 12,
          margin: 0,
          letterSpacing: '0.05em',
        }}>
          建議橫向觀看以獲得最佳體驗
        </p>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #111; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
