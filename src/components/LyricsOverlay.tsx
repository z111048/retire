import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { FRAME_RATE } from '../constants';

interface LyricLine {
  start: number;
  end: number;
  text: string;
}

interface LyricsOverlayProps {
  lyrics: LyricLine[];
  suppressRanges?: [number, number][];
}

const FADE_S = 0.25;

export const LyricsOverlay: React.FC<LyricsOverlayProps> = ({ lyrics, suppressRanges }) => {
  const frame = useCurrentFrame();
  const currentSec = frame / FRAME_RATE;

  const isSuppressed = suppressRanges?.some(([s, e]) => currentSec >= s && currentSec < e) ?? false;

  // Find active lyric
  const active = lyrics.find(l => currentSec >= l.start && currentSec <= l.end);
  if (!active || isSuppressed) return null;

  const fadeInEnd  = active.start + FADE_S;
  const fadeOutStart = active.end - FADE_S;

  const opacity = interpolate(
    currentSec,
    [active.start, Math.min(fadeInEnd, active.end), Math.max(fadeOutStart, active.start), active.end],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    currentSec,
    [active.start, fadeInEnd],
    [16, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = interpolate(
    currentSec,
    [active.start, fadeInEnd],
    [0.88, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: 72,
      pointerEvents: 'none',
    }}>
      <div style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'bottom center',
        // backdropFilter removed — triggers full-frame compositing every frame on mobile
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        borderRadius: 10,
        padding: '14px 40px',
        maxWidth: '86%',
        textAlign: 'center',
        borderLeft: '3px solid #C9A84C',
        borderRight: '3px solid #C9A84C',
      }}>
        <span style={{
          color: '#FFF8EC',
          fontSize: 52,
          fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
          fontWeight: 500,
          letterSpacing: '0.1em',
          textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(201,168,76,0.35), 0 0 40px rgba(201,168,76,0.15)',
          lineHeight: 1.5,
        }}>
          {active.text}
        </span>
      </div>
    </div>
  );
};
