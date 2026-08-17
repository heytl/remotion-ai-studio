import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { VideoSchema, VideoScene, VideoTheme } from '../lib/types';
import { BulletsScene } from './scenes/BulletsScene';
import { CaptionScene } from './scenes/CaptionScene';
import { ImageTextScene } from './scenes/ImageTextScene';
import { TitleScene } from './scenes/TitleScene';
import { TransitionScene } from './scenes/TransitionScene';

const SceneRenderer: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  switch (scene.type) {
    case 'title':
      return <TitleScene scene={scene} theme={theme} />;
    case 'bullets':
      return <BulletsScene scene={scene} theme={theme} />;
    case 'imageText':
      return <ImageTextScene scene={scene} theme={theme} />;
    case 'transition':
      return <TransitionScene scene={scene} theme={theme} />;
    case 'caption':
    default:
      return <CaptionScene scene={scene} theme={theme} />;
  }
};

/**
 * 通用视频合成组件：由 VideoSchema（JSON）驱动，
 * 无需为每个视频编写代码。每个场景按 durationSeconds 依次排列。
 */
export const VideoComposition: React.FC<{ schema: VideoSchema }> = ({ schema }) => {
  let frame = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: schema.theme.backgroundColor }}>
      {schema.scenes.map((scene) => {
        const durationInFrames = Math.max(1, Math.round((scene.durationSeconds || 0) * schema.fps));
        const from = frame;
        frame += durationInFrames;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.title || scene.type}>
            {scene.audioDataUrl ? <Audio src={scene.audioDataUrl} /> : null}
            <SceneRenderer scene={scene} theme={schema.theme} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
