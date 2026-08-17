import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/types';
import { AnimatedIn, headingStyle, NarrationBar, SceneBackground } from './common';

/** 图文场景：背景图 + 标题/说明 */
export const ImageTextScene: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  return (
    <AbsoluteFill>
      {scene.imageUrl ? (
        <AbsoluteFill>
          <Img src={scene.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <AbsoluteFill
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.78) 100%)',
            }}
          />
        </AbsoluteFill>
      ) : (
        <SceneBackground scene={scene} theme={theme} />
      )}
      <AnimatedIn animation={scene.animation}>
        <AbsoluteFill style={{ padding: 90, flexDirection: 'column', justifyContent: 'flex-end' }}>
          {scene.title ? (
            <div style={{ ...headingStyle(theme), marginBottom: 16, textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}>
              {scene.title}
            </div>
          ) : null}
        </AbsoluteFill>
      </AnimatedIn>
      <NarrationBar text={scene.narration} theme={theme} />
    </AbsoluteFill>
  );
};
