import React from 'react';
import { Composition } from 'remotion';
import { defaultSchema, getComposition } from '../lib/schema-builder';
import { VideoSchema } from '../lib/types';
import { VideoComposition } from './VideoComposition';

export const COMPOSITION_ID = 'AiVideo';

export const RemotionRoot: React.FC = () => {
  const base = getComposition(defaultSchema());
  return (
    <Composition
      id={COMPOSITION_ID}
      component={VideoComposition}
      durationInFrames={base.durationInFrames}
      fps={base.fps}
      width={base.width}
      height={base.height}
      defaultProps={{ schema: defaultSchema() }}
      calculateMetadata={({ props }: { props: { schema: VideoSchema } }) => {
        const c = getComposition(props.schema || defaultSchema());
        return {
          durationInFrames: c.durationInFrames,
          fps: c.fps,
          width: c.width,
          height: c.height,
          props,
        };
      }}
    />
  );
};
