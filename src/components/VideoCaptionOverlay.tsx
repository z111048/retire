import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { FRAME_RATE } from '../constants';
import { KAI_FONT } from '../utils/fonts';
import videoCaptions from '../../data/video-captions.json';

interface Segment {
  start: number;
  end: number;
  text: string;
}

const CAPTIONS = videoCaptions as unknown as Record<string, Segment[]>;
const FADE_S = 0.25;

interface VideoCaptionOverlayProps {
  fileName: string;
}

// 影片片段對話字幕（Whisper 自動轉錄，data/video-captions.json 可手動修正時間或文字）。
// frame 是 Sequence 內的本地幀數，天生就對齊影片自己的時間軸，不需額外配時。
export const VideoCaptionOverlay: React.FC<VideoCaptionOverlayProps> = ({ fileName }) => {
  const frame = useCurrentFrame();
  const currentSec = frame / FRAME_RATE;
  const segments = CAPTIONS[fileName];
  if (!segments) return null;

  const active = segments.find((s) => currentSec >= s.start && currentSec <= s.end);
  if (!active) return null;

  const opacity = interpolate(
    currentSec,
    [active.start, active.start + FADE_S, active.end - FADE_S, active.end],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 44,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        opacity,
        backgroundColor: 'rgba(0,0,0,0.62)',
        borderRadius: 8,
        padding: '8px 26px',
        maxWidth: '80%',
      }}>
        <span style={{
          color: '#FFF8EC',
          fontSize: 34,
          fontFamily: KAI_FONT,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
        }}>
          {active.text}
        </span>
      </div>
    </div>
  );
};
