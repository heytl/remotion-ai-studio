import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/types';
import { AnimatedIn, bodyStyle, headingStyle, NarrationBar, SceneBackground } from './common';

const BulletItem: React.FC<{ text: string; index: number; theme: VideoTheme }> = ({
  text,
  index,
  theme,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [index * 8, index * 8 + 16], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(frame, [index * 8, index * 8 + 16], [24, 0], {
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 24,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: theme.accentColor,
          marginTop: Math.round(theme.bodySize * 0.42),
          flexShrink: 0,
        }}
      />
      <div style={bodyStyle(theme)}>{text}</div>
    </div>
  );
};

/** 要点列表页 */
export const BulletsScene: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  return (
    <AbsoluteFill>
      <SceneBackground scene={scene} theme={theme} />
      <AnimatedIn animation={scene.animation}>
        <AbsoluteFill style={{ padding: 90, flexDirection: 'column', justifyContent: 'flex-start' }}>
          {scene.title ? (
            <div style={{ ...headingStyle(theme), marginBottom: 52 }}>{scene.title}</div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            {scene.bullets.map((b, i) => (
              <BulletItem key={i} text={b} index={i} theme={theme} />
            ))}
          </div>
        </AbsoluteFill>
      </AnimatedIn>
      <NarrationBar text={scene.narration} theme={theme} />
    </AbsoluteFill>
  );
};
