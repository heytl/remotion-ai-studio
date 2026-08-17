import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Animation, VideoScene, VideoTheme } from '../../lib/types';

/** 场景背景：纯色或渐变 */
export const SceneBackground: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  const background =
    scene.backgroundType === 'gradient' && scene.gradientFrom && scene.gradientTo
      ? `linear-gradient(135deg, ${scene.gradientFrom} 0%, ${scene.gradientTo} 100%)`
      : scene.backgroundColor || theme.backgroundColor;
  return <AbsoluteFill style={{ background }} />;
};

/** 进入动画容器（fade / slide / zoom） */
export const AnimatedIn: React.FC<{ animation: Animation; children: React.ReactNode }> = ({
  animation,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = Math.max(1, Math.round(fps * 0.7));
  let opacity = 1;
  let transform: string | undefined;

  if (animation === 'fade') {
    opacity = interpolate(frame, [0, dur], [0, 1], { extrapolateRight: 'clamp' });
  } else if (animation === 'slide') {
    opacity = interpolate(frame, [0, dur], [0, 1], { extrapolateRight: 'clamp' });
    transform = `translateY(${interpolate(frame, [0, dur], [90, 0], {
      extrapolateRight: 'clamp',
    })}px)`;
  } else if (animation === 'zoom') {
    opacity = interpolate(frame, [0, dur], [0, 1], { extrapolateRight: 'clamp' });
    transform = `scale(${interpolate(frame, [0, dur], [0.82, 1], {
      extrapolateRight: 'clamp',
    })})`;
  }

  return (
    <AbsoluteFill
      style={{ opacity, transform, transformOrigin: 'center center', willChange: 'transform, opacity' }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** 底部旁白/字幕条 */
export const NarrationBar: React.FC<{ text: string; theme: VideoTheme }> = ({ text, theme }) => {
  if (!text) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: 70 }}>
      <div
        style={{
          maxWidth: '82%',
          textAlign: 'center',
          color: theme.textColor,
          fontFamily: theme.fontFamily,
          fontSize: Math.max(22, Math.round(theme.bodySize * 0.68)),
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '14px 30px',
          borderRadius: 14,
          lineHeight: 1.45,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const headingStyle = (theme: VideoTheme): React.CSSProperties => ({
  fontSize: theme.headingSize,
  fontWeight: 700,
  color: theme.textColor,
  fontFamily: theme.fontFamily,
  lineHeight: 1.25,
});

export const bodyStyle = (theme: VideoTheme): React.CSSProperties => ({
  fontSize: theme.bodySize,
  color: theme.textColor,
  fontFamily: theme.fontFamily,
  lineHeight: 1.5,
});
