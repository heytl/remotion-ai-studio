import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Animation, CaptionCue, VideoScene, VideoTheme } from '../../lib/types';

/** 背景持续做非常轻微的位移，避免长场景完全静止。 */
export const SceneBackground: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const background =
    scene.backgroundType === 'gradient' && scene.gradientFrom && scene.gradientTo
      ? `linear-gradient(135deg, ${scene.gradientFrom} 0%, ${scene.gradientTo} 58%, ${theme.backgroundColor} 100%)`
      : scene.backgroundColor || theme.backgroundColor;
  const driftX = Math.sin(frame / 72) * width * 0.018;
  const driftY = Math.cos(frame / 88) * height * 0.014;
  const isPortrait = height > width;

  return (
    <AbsoluteFill style={{ background, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          opacity: 0.16,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: `${isPortrait ? 72 : 88}px ${isPortrait ? 72 : 88}px`,
          maskImage: 'linear-gradient(to bottom, black, transparent 82%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: isPortrait ? width * 0.8 : width * 0.42,
          height: isPortrait ? width * 0.8 : width * 0.42,
          borderRadius: '50%',
          left: -width * 0.1 + driftX,
          top: -height * 0.14 + driftY,
          background: `radial-gradient(circle, ${theme.accentColor}66 0%, transparent 68%)`,
          filter: `blur(${Math.round(width * 0.018)}px)`,
          opacity: 0.42,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: isPortrait ? width * 0.9 : width * 0.5,
          height: isPortrait ? width * 0.9 : width * 0.5,
          borderRadius: '50%',
          right: -width * 0.15 - driftX * 0.7,
          bottom: -height * 0.25 - driftY,
          background: `radial-gradient(circle, ${theme.primaryColor}bb 0%, transparent 70%)`,
          filter: `blur(${Math.round(width * 0.024)}px)`,
          opacity: 0.48,
        }}
      />
    </AbsoluteFill>
  );
};

/** 场景级入场；元素级动画由 ElementReveal 单独承担。 */
export const AnimatedIn: React.FC<{
  animation: Animation;
  children: React.ReactNode;
  delayFrames?: number;
}> = ({ animation, children, delayFrames = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - delayFrames);
  const driver = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
    durationInFrames: Math.round(fps * 0.7),
  });
  const started = frame >= delayFrames;
  let transform = 'none';
  if (animation === 'slide') transform = `translateY(${interpolate(driver, [0, 1], [54, 0])}px)`;
  if (animation === 'zoom') transform = `scale(${interpolate(driver, [0, 1], [0.9, 1])})`;

  return (
    <AbsoluteFill
      style={{
        opacity: animation === 'none' ? 1 : started ? driver : 0,
        transform,
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const ElementReveal: React.FC<{
  startFrame: number;
  children: React.ReactNode;
  direction?: 'up' | 'left' | 'right' | 'scale';
}> = ({ startFrame, children, direction = 'up' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const started = frame >= startFrame;
  const driver = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 16, stiffness: 145, mass: 0.75 },
    durationInFrames: Math.round(fps * 0.62),
  });
  const distance = interpolate(driver, [0, 1], [36, 0]);
  const transform = direction === 'left'
    ? `translateX(${distance}px)`
    : direction === 'right'
      ? `translateX(${-distance}px)`
      : direction === 'scale'
        ? `scale(${interpolate(driver, [0, 1], [0.9, 1])})`
        : `translateY(${distance}px)`;
  return (
    <div style={{ opacity: started ? driver : 0, transform, willChange: 'transform, opacity' }}>
      {children}
    </div>
  );
};

/** 主内容安全区：始终为底部逐句字幕预留空间。 */
export const SafeContent: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  return (
    <div
      style={{
        position: 'absolute',
        left: isPortrait ? '7%' : '5.2%',
        right: isPortrait ? '7%' : '5.2%',
        top: isPortrait ? '5.5%' : '6.5%',
        bottom: isPortrait ? '23%' : '22%',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

function highlightedCaption(text: string, emphasis: string[], color: string): React.ReactNode {
  const keyword = emphasis.find((value) => value && text.includes(value));
  if (!keyword) return text;
  const keywordIndex = text.indexOf(keyword);
  const before = text.slice(0, keywordIndex);
  const after = text.slice(keywordIndex + keyword.length);
  return (
    <>
      {before}
      <span style={{ color, fontWeight: 800 }}>{keyword}</span>
      {after}
    </>
  );
}

/** 每次只渲染当前 cue，字幕区域和正文区域物理分离。 */
export const CaptionTrack: React.FC<{
  captions: CaptionCue[];
  theme: VideoTheme;
}> = ({ captions, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;
  const cue = captions.find((item) => nowMs >= item.startMs && nowMs < item.endMs);
  if (!cue) return null;

  const startFrame = Math.round((cue.startMs / 1000) * fps);
  const endFrame = Math.round((cue.endMs / 1000) * fps);
  const cueFrames = Math.max(2, endFrame - startFrame);
  const fadeFrames = Math.max(2, Math.min(6, Math.floor(cueFrames / 3)));
  const local = frame - startFrame;
  const opacity = Math.min(
    interpolate(local, [0, fadeFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(local, [cueFrames - fadeFrames, cueFrames], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const rise = interpolate(local, [0, fadeFrames], [14, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const isPortrait = height > width;
  const fontSize = Math.max(30, Math.round(theme.bodySize * (isPortrait ? 0.92 : 0.9)));

  return (
    <div
      style={{
        position: 'absolute',
        left: isPortrait ? '6%' : '10%',
        right: isPortrait ? '6%' : '10%',
        bottom: isPortrait ? '6.5%' : '5.4%',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
        transform: `translateY(${rise}px)`,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: isPortrait ? '94%' : '78%',
          color: theme.captionTextColor,
          fontFamily: theme.fontFamily,
          fontSize,
          fontWeight: 650,
          lineHeight: 1.38,
          letterSpacing: '0.01em',
          textAlign: 'center',
          backgroundColor: theme.captionBackgroundColor,
          border: '1px solid rgba(255,255,255,.14)',
          boxShadow: '0 16px 48px rgba(0,0,0,.34)',
          padding: `${Math.round(fontSize * 0.34)}px ${Math.round(fontSize * 0.72)}px`,
          borderRadius: Math.round(fontSize * 0.55),
          backdropFilter: 'blur(14px)',
        }}
      >
        {highlightedCaption(cue.text, cue.emphasis || [], theme.accentColor)}
      </div>
    </div>
  );
};

/** 场景结尾统一快速退出，减少硬切。 */
export const SceneEnvelope: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const exitFrames = Math.min(8, Math.max(3, Math.round(durationInFrames * 0.05)));
  const opacity = interpolate(
    frame,
    [0, 5, Math.max(6, durationInFrames - exitFrames), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export function responsiveTextSize(base: number, text: string, preferredCharacters: number, minScale = 0.62): number {
  const length = Math.max(1, Array.from(text || '').length);
  const scale = length <= preferredCharacters ? 1 : Math.max(minScale, preferredCharacters / length);
  return Math.round(base * scale);
}

export const headingStyle = (theme: VideoTheme, text = ''): React.CSSProperties => ({
  fontSize: responsiveTextSize(theme.headingSize, text, 22, 0.68),
  fontWeight: 800,
  color: theme.textColor,
  fontFamily: theme.fontFamily,
  lineHeight: 1.14,
  letterSpacing: '-0.025em',
  textWrap: 'balance',
});

export const bodyStyle = (theme: VideoTheme): React.CSSProperties => ({
  fontSize: theme.bodySize,
  color: theme.textColor,
  fontFamily: theme.fontFamily,
  lineHeight: 1.45,
});
