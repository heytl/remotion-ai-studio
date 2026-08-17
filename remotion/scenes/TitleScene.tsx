import React from 'react';
import { AbsoluteFill } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/types';
import { AnimatedIn, CaptionTrack, SceneBackground } from './common';
import { VisualStage } from './VisualStage';

export const TitleScene: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => (
  <AbsoluteFill>
    <SceneBackground scene={scene} theme={theme} />
    <AnimatedIn animation={scene.animation}>
      <VisualStage scene={scene} theme={theme} />
    </AnimatedIn>
    <CaptionTrack captions={scene.captions} theme={theme} />
  </AbsoluteFill>
);
