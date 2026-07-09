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

// 慢進慢出的 S 曲線，讓淡入淡出讀起來像設計過的節奏，而不是內插的線性痕跡
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

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
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOutCubic }
  );

  // 兜了一圈（硬描邊像迷因梗圖、全寬暗角在淺色卡片上變髒污色塊、純陰影又覺得
  // 不夠）確認問題其實只出在「金色雙邊框」，半透明黑底本身沒問題、也比較適合。
  // 所以保留原本的淡淡透明黑底圓角方塊，只是拿掉金色 borderLeft/borderRight。
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
      <div style={{
        // 只做淡入淡出，不縮放不位移，避免每句出現時的閃爍彈跳感
        opacity,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        borderRadius: 10,
        padding: '14px 40px',
        maxWidth: '86%',
        textAlign: 'center',
      }}>
        <span style={{
          color: '#FFF8EC',
          fontSize: 46,
          fontFamily: KAI_FONT,
          fontWeight: 500,
          letterSpacing: '0.08em',
          lineHeight: 1.5,
          textShadow: '0 2px 6px rgba(0,0,0,0.6)',
        }}>
          {active.text}
        </span>
      </div>
    </div>
  );
};
