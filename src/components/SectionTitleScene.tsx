import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface SectionTitleSceneProps {
  title: string;
  subtitle: string;
}

export const SectionTitleScene: React.FC<SectionTitleSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

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

  // Shimmer: sweeps across the gold bars once per scene
  const shimmerPos = interpolate(frame, [fadeIn, durationInFrames - fadeOut], [-60, 160], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shimmerBar = `linear-gradient(90deg,
    #C9A84C 0%,
    #C9A84C ${shimmerPos - 20}%,
    #FFE080 ${shimmerPos}%,
    #C9A84C ${shimmerPos + 20}%,
    #C9A84C 100%)`;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFF8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      {/* Gold horizontal rule with shimmer */}
      <div
        style={{
          width: 80,
          height: 2,
          background: shimmerBar,
          marginBottom: 32,
        }}
      />

      <h2
        style={{
          fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
          fontSize: 80,
          fontWeight: 700,
          color: '#3A2E1E',
          letterSpacing: '0.15em',
          margin: 0,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
          fontSize: 42,
          fontWeight: 400,
          color: '#7A6A52',
          letterSpacing: '0.1em',
          marginTop: 20,
          opacity: subtitleOpacity,
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
        }}
      />
    </div>
  );
};
