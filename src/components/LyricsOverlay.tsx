import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { FRAME_RATE } from '../constants';
import { KAI_FONT } from '../utils/fonts';

interface LyricLine {
  start: number;
  end: number;
  text: string;
}

interface LyricsOverlayProps {
  lyrics: LyricLine[];
  suppressRanges?: [number, number][];
}

const FADE_S = 0.4;

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

  // 電影／大片字幕的標準做法：不用底色方塊、不用邊框，純文字＋黑色描邊（多層
  // 8 方向 text-shadow 模擬 stroke）＋下方柔和陰影撐開層次，靠這個就能在任何
  // 背景（深色影片、淺色章節標題卡）上都維持清晰，比方塊+金色邊框更高級、
  // 更不會有「加了一個外框」的廉價感。
  const STROKE = '#000';
  const strokeShadow = [1, -1].flatMap((sx) =>
    [1, -1].map((sy) => `${sx}px ${sy}px 0 ${STROKE}`)
  ).concat([`0px 2px 0 ${STROKE}`, `0px -2px 0 ${STROKE}`, `2px 0px 0 ${STROKE}`, `-2px 0px 0 ${STROKE}`])
    .join(', ');

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: 40,
      pointerEvents: 'none',
    }}>
      <span style={{
        // 只做淡入淡出，不縮放不位移，避免每句出現時的閃爍彈跳感
        opacity,
        color: '#FFFFFF',
        fontSize: 48,
        fontFamily: KAI_FONT,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textAlign: 'center',
        maxWidth: '86%',
        lineHeight: 1.5,
        textShadow: `${strokeShadow}, 0 6px 18px rgba(0,0,0,0.55)`,
      }}>
        {active.text}
      </span>
    </div>
  );
};
