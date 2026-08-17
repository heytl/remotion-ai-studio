'use client';

import React, { useMemo } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { getComposition } from '@/lib/schema-builder';
import { VideoSchema } from '@/lib/types';
import { VideoComposition } from '@/remotion/VideoComposition';

export const PreviewPlayer: React.FC<{
  schema: VideoSchema;
  playerRef?: React.RefObject<PlayerRef | null>;
  onSceneChange?: (frame: number) => void;
}> = ({ schema, playerRef }) => {
  const comp = useMemo(() => getComposition(schema), [schema]);

  return (
    <div
      className="mx-auto w-full overflow-hidden rounded-xl border border-slate-700 bg-black shadow-2xl"
      style={{ aspectRatio: `${comp.width} / ${comp.height}`, maxHeight: '70vh' }}
    >
      <Player
        ref={playerRef}
        component={VideoComposition}
        inputProps={{ schema }}
        durationInFrames={comp.durationInFrames}
        fps={comp.fps}
        compositionWidth={comp.width}
        compositionHeight={comp.height}
        controls
        loop
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
