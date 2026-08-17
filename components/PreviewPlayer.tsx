'use client';

import React, { useMemo } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { getComposition } from '@/lib/schema-builder';
import { VideoSchema } from '@/lib/types';
import { VideoComposition } from '@/remotion/VideoComposition';

export const PreviewPlayer: React.FC<{ schema: VideoSchema; playerRef?: React.RefObject<PlayerRef | null> }> = ({ schema, playerRef }) => {
  const composition = useMemo(() => getComposition(schema), [schema]);
  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border/25 bg-black shadow-[0_24px_70px_rgba(0,0,0,.38),0_0_60px_hsl(var(--primary)/.08)]" style={{ aspectRatio: `${composition.width} / ${composition.height}`, maxHeight: '70vh' }}>
      <Player ref={playerRef} component={VideoComposition} inputProps={{ schema }} durationInFrames={composition.durationInFrames} fps={composition.fps} compositionWidth={composition.width} compositionHeight={composition.height} controls loop style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
