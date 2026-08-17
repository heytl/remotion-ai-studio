import React from 'react';
import { AbsoluteFill } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/types';
import { AnimatedIn, SceneBackground } from './common';

/** 转场页：整屏强调色 + 一句话 */
export const TransitionScene: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  return (
    <AbsoluteFill>
      <SceneBackground scene={scene} theme={theme} />
      <AnimatedIn animation={scene.animation}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 100 }}>
          <div
            style={{
              fontSize: theme.headingSize,
              fontWeight: 800,
              color: theme.textColor,
              textAlign: 'center',
              lineHeight: 1.25,
              fontFamily: theme.fontFamily,
            }}
          >
            {scene.title || scene.narration}
          </div>
        </AbsoluteFill>
      </AnimatedIn>
    </AbsoluteFill>
  );
};
