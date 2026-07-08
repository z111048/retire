import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { HANDWRITING_FONT, KAI_FONT } from '../utils/fonts';
import { DEFAULT_SECTION_ACCENT } from '../constants';

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

interface SectionTitleSceneProps {
  title: string;
  subtitle: string;
  accentColor?: string;
}

export const SectionTitleScene: React.FC<SectionTitleSceneProps> = ({
  title,
  subtitle,
  accentColor = DEFAULT_SECTION_ACCENT,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const [r, g, b] = hexToRgb(accentColor);
  const accentRgba = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;

  const fadeIn = 15;
  const fadeOut = 15;

  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const titleY = interpolate(frame, [0, fadeIn], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const subtitleOpacity = interpolate(frame, [fadeIn, fadeIn + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Gold shimmer sweeping across bars
  const shimmerPos = interpolate(frame, [fadeIn, durationInFrames - fadeOut], [-60, 160], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shimmerBar = `linear-gradient(90deg,
    ${accentColor} 0%,
    ${accentColor} ${shimmerPos - 20}%,
    #FFE080 ${shimmerPos}%,
    ${accentColor} ${shimmerPos + 20}%,
    ${accentColor} 100%)`;

  // Safe keyframe helper: evenly spread across the active window [fadeIn, durationInFrames - fadeOut]
  const activeStart = fadeIn;
  const activeEnd = durationInFrames - fadeOut;
  const activeMid = Math.round((activeStart + activeEnd) / 2);

  // Expanding rings
  const ring1Scale = interpolate(frame, [activeStart, activeEnd], [0.5, 1.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ring1Opacity = interpolate(
    frame,
    [activeStart, activeMid, activeEnd],
    [0, 0.18, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const ring2Start = Math.min(activeStart + 8, activeMid);
  const ring2Scale = interpolate(frame, [ring2Start, activeEnd], [0.4, 2.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ring2Mid = Math.round((ring2Start + activeEnd) / 2);
  const ring2Opacity = interpolate(
    frame,
    [ring2Start, ring2Mid, activeEnd],
    [0, 0.10, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Soft radial glow behind title
  const glowOpacity = interpolate(frame, [activeStart, activeMid, activeEnd], [0, 0.55, 0.40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #FFFDF6 0%, #FFF4E0 45%, #FFF0D8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft gold glow behind the text area */}
      <div style={{
        position: 'absolute',
        width: '50%',
        height: '50%',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentRgba(0.22)} 0%, transparent 70%)`,
        opacity: glowOpacity,
        pointerEvents: 'none',
      }} />

      {/* Expanding ring 1 */}
      <div style={{
        position: 'absolute',
        width: '55%',
        paddingBottom: '55%',
        borderRadius: '50%',
        border: `1.5px solid ${accentRgba(0.9)}`,
        transform: `scale(${ring1Scale})`,
        opacity: ring1Opacity,
        pointerEvents: 'none',
        top: '50%',
        left: '50%',
        marginTop: '-27.5%',
        marginLeft: '-27.5%',
      }} />

      {/* Expanding ring 2 (larger, more transparent) */}
      <div style={{
        position: 'absolute',
        width: '55%',
        paddingBottom: '55%',
        borderRadius: '50%',
        border: `1px solid ${accentRgba(0.7)}`,
        transform: `scale(${ring2Scale})`,
        opacity: ring2Opacity,
        pointerEvents: 'none',
        top: '50%',
        left: '50%',
        marginTop: '-27.5%',
        marginLeft: '-27.5%',
      }} />

      {/* Gold horizontal rule with shimmer */}
      <div
        style={{
          width: 80,
          height: 2,
          background: shimmerBar,
          marginBottom: 32,
          position: 'relative',
          zIndex: 1,
        }}
      />

      <h2
        style={{
          fontFamily: HANDWRITING_FONT,
          fontSize: 96,
          fontWeight: 400,
          color: '#3A2E1E',
          letterSpacing: '0.15em',
          margin: 0,
          transform: `translateY(${titleY}px)`,
          position: 'relative',
          zIndex: 1,
          textShadow: `0 2px 20px ${accentRgba(0.25)}`,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          fontFamily: KAI_FONT,
          fontSize: 42,
          fontWeight: 500,
          color: '#7A6A52',
          letterSpacing: '0.1em',
          marginTop: 20,
          opacity: subtitleOpacity,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {subtitle}
      </p>

      <div
        style={{
          width: 80,
          height: 2,
          background: shimmerBar,
          marginTop: 32,
          position: 'relative',
          zIndex: 1,
        }}
      />
    </div>
  );
};
