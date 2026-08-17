import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/types';
import { AnimatedIn, CaptionTrack, SceneBackground } from './common';
import { VisualStage } from './VisualStage';

export const ImageTextScene: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => (
  <AbsoluteFill>
    <SceneBackground scene={scene} theme={theme} />
    {scene.imageUrl ? (
      <AbsoluteFill>
        <Img src={scene.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.26 }} />
        <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(2,6,23,.92), rgba(2,6,23,.42) 55%, rgba(2,6,23,.82))' }} />
      </AbsoluteFill>
    ) : null}
    <AnimatedIn animation={scene.animation}>
      <VisualStage scene={scene} theme={theme} />
    </AnimatedIn>
    <CaptionTrack captions={scene.captions} theme={theme} />
  </AbsoluteFill>
);
