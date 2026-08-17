import React from 'react';
import { AbsoluteFill } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/types';
import { AnimatedIn, bodyStyle, SceneBackground } from './common';

/** 纯字幕 / 口播场景 */
export const CaptionScene: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  return (
    <AbsoluteFill>
      <SceneBackground scene={scene} theme={theme} />
      <AnimatedIn animation={scene.animation}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 100 }}>
          {scene.title ? (
            <div
              style={{
                fontSize: Math.max(24, Math.round(theme.bodySize * 0.8)),
                color: theme.accentColor,
                marginBottom: 30,
                fontFamily: theme.fontFamily,
              }}
            >
              {scene.title}
            </div>
          ) : null}
          <div
            style={{
              ...bodyStyle(theme),
              fontSize: Math.round(theme.bodySize * 1.15),
              textAlign: 'center',
              maxWidth: '86%',
            }}
          >
            {scene.narration}
          </div>
        </AbsoluteFill>
      </AnimatedIn>
    </AbsoluteFill>
  );
};
