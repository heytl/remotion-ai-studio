import React from 'react';
import { AbsoluteFill } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/types';
import { AnimatedIn, SceneBackground } from './common';

/** 片头标题页 */
export const TitleScene: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  return (
    <AbsoluteFill>
      <SceneBackground scene={scene} theme={theme} />
      <AnimatedIn animation={scene.animation}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 90 }}>
          <div
            style={{
              fontSize: 30,
              letterSpacing: 10,
              color: theme.accentColor,
              fontFamily: theme.fontFamily,
              marginBottom: 30,
              textTransform: 'uppercase',
            }}
          >
            AI · VIDEO
          </div>
          <div
            style={{
              fontSize: theme.headingSize,
              fontWeight: 800,
              color: theme.textColor,
              textAlign: 'center',
              lineHeight: 1.22,
              fontFamily: theme.fontFamily,
              maxWidth: '90%',
            }}
          >
            {scene.title}
          </div>
          {scene.subtitle ? (
            <div
              style={{
                fontSize: Math.max(26, Math.round(theme.headingSize * 0.46)),
                color: theme.accentColor,
                marginTop: 36,
                fontFamily: theme.fontFamily,
                textAlign: 'center',
              }}
            >
              {scene.subtitle}
            </div>
          ) : null}
        </AbsoluteFill>
      </AnimatedIn>
    </AbsoluteFill>
  );
};
