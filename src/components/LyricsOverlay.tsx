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

  // 前一版加了一層畫面下方的暗角漸層想確保任何背景都夠清晰，結果在淺色的章節
  // 標題卡（米白色背景）上變成一塊突兀的髒污色塊，比方塊+邊框更難看。拿掉，
  // 改成只靠貼著字形本身的緊緻模糊陰影（不擴散成一片，只在筆畫邊緣加深）撐出
  // 清晰度——這樣不管在深色照片或淺色卡片上，畫面本身都不會被額外加上一層看
  // 得出來的色塊，字幕讀起來才會像「文字本身自帶清晰度」而不是「貼了一塊東西」。
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
        color: '#FFF8EC',
        fontSize: 46,
        fontFamily: KAI_FONT,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textAlign: 'center',
        maxWidth: '86%',
        lineHeight: 1.5,
        textShadow: '0 0 2px rgba(0,0,0,0.95), 0 0 5px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.85), 0 3px 10px rgba(0,0,0,0.5)',
      }}>
        {active.text}
      </span>
    </div>
  );
};
