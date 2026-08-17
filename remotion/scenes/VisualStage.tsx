import React from 'react';
import { Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoScene, VideoTheme, VisualElement } from '../../lib/types';
import {
  ElementReveal,
  SafeContent,
  headingStyle,
  responsiveTextSize,
} from './common';

const surface = (theme: VideoTheme, active = false): React.CSSProperties => ({
  border: `1px solid ${active ? `${theme.accentColor}aa` : 'rgba(255,255,255,.13)'}`,
  background: active
    ? `linear-gradient(145deg, ${theme.accentColor}2e, ${theme.surfaceColor})`
    : theme.surfaceColor,
  boxShadow: active
    ? `0 22px 60px ${theme.accentColor}24, inset 0 1px rgba(255,255,255,.08)`
    : '0 18px 48px rgba(0,0,0,.18), inset 0 1px rgba(255,255,255,.05)',
  backdropFilter: 'blur(16px)',
});

function getStartFrame(scene: VideoScene, index: number, fps: number): number {
  const elementCount = Math.max(1, scene.visualPlan.elements.length);
  if (scene.beats.length >= elementCount && scene.beats[index]) {
    return Math.round((scene.beats[index].startMs / 1000) * fps);
  }
  if (elementCount > 1) {
    const revealSecond = scene.durationSeconds * (0.12 + (index / (elementCount - 1)) * 0.54);
    return Math.round(revealSecond * fps);
  }
  return Math.round(fps * (0.45 + index * 0.35));
}

const Glyph: React.FC<{
  element: VisualElement;
  index: number;
  theme: VideoTheme;
  active: boolean;
  size?: number;
}> = ({ element, index, theme, active, size = 64 }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin((frame + index * 13) / 12) * (active ? 0.045 : 0.018);
  const color = active ? theme.accentColor : theme.mutedTextColor;
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: Math.round(size * 0.3),
        display: 'grid',
        placeItems: 'center',
        color,
        background: `linear-gradient(145deg, ${theme.accentColor}32, rgba(255,255,255,.04))`,
        border: `1px solid ${theme.accentColor}55`,
        transform: `scale(${pulse})`,
      }}
    >
      {element.kind === 'metric' ? (
        <div style={{ fontFamily: theme.fontFamily, fontSize: size * 0.26, fontWeight: 900 }}>
          {element.value || String(index + 1).padStart(2, '0')}
        </div>
      ) : element.kind === 'step' ? (
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 48 48" fill="none">
          <path d="M8 34h9V22h9V12h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m34 7 6 5-6 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : element.kind === 'comparison' ? (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 48 48" fill="none">
          <path d="M8 14h30M8 34h30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="m32 8 6 6-6 6M14 28l-6 6 6 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : element.kind === 'quote' ? (
        <div style={{ fontSize: size * 0.66, lineHeight: 1, fontWeight: 900 }}>“</div>
      ) : (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="4" />
          <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3" strokeDasharray="5 6" />
          <circle cx="37" cy="13" r="3" fill="currentColor" />
        </svg>
      )}
    </div>
  );
};

const Card: React.FC<{
  element: VisualElement;
  index: number;
  scene: VideoScene;
  theme: VideoTheme;
  active: boolean;
  compact?: boolean;
}> = ({ element, index, scene, theme, active, compact = false }) => {
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const startFrame = getStartFrame(scene, index, fps);
  const labelSize = compact
    ? Math.max(24, Math.round(theme.bodySize * 0.72))
    : Math.max(28, Math.round(theme.bodySize * (isPortrait ? 0.84 : 0.92)));
  return (
    <ElementReveal startFrame={startFrame} direction={index % 2 === 0 ? 'up' : 'left'}>
      <div
        style={{
          ...surface(theme, active),
          borderRadius: isPortrait ? 28 : 24,
          padding: compact ? (isPortrait ? '24px' : '22px 26px') : (isPortrait ? '30px' : '28px 30px'),
          display: 'flex',
          flexDirection: compact && !isPortrait ? 'row' : 'column',
          alignItems: compact && !isPortrait ? 'center' : 'flex-start',
          gap: compact ? 18 : 24,
          minHeight: compact ? undefined : isPortrait ? 190 : 210,
          height: compact ? 'auto' : undefined,
          transform: active ? 'translateY(-4px)' : 'translateY(0)',
        }}
      >
        <Glyph element={element} index={index} theme={theme} active={active} size={compact ? 54 : 66} />
        <div style={{ minWidth: 0 }}>
          {element.value && element.kind !== 'metric' ? (
            <div style={{ color: theme.accentColor, fontSize: labelSize * 0.72, fontWeight: 800, marginBottom: 5 }}>
              {element.value}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: responsiveTextSize(labelSize, element.label, 18, 0.76),
              fontWeight: 800,
              color: theme.textColor,
              lineHeight: 1.18,
              textWrap: 'balance',
            }}
          >
            {element.label}
          </div>
          {element.description ? (
            <div
              style={{
                marginTop: 10,
                color: theme.mutedTextColor,
                fontFamily: theme.fontFamily,
                fontSize: Math.max(20, Math.round(labelSize * 0.62)),
                lineHeight: 1.38,
              }}
            >
              {element.description}
            </div>
          ) : null}
        </div>
      </div>
    </ElementReveal>
  );
};

const Header: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28, marginBottom: isPortrait ? 40 : 32 }}>
      <div style={{ minWidth: 0, maxWidth: isPortrait ? '100%' : '82%' }}>
        <div style={{ color: theme.accentColor, fontFamily: theme.fontFamily, fontSize: Math.max(18, theme.bodySize * 0.45), fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
          Key concept
        </div>
        <div style={headingStyle(theme, scene.title)}>{scene.title}</div>
      </div>
      {!isPortrait ? (
        <div style={{ display: 'flex', gap: 8, paddingTop: 12 }}>
          {(scene.beats || []).slice(0, 5).map((beat, index) => (
            <div key={beat.id || index} style={{ width: index === 0 ? 34 : 10, height: 10, borderRadius: 999, background: index === 0 ? theme.accentColor : 'rgba(255,255,255,.18)' }} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

function activeBeatFor(scene: VideoScene, frame: number, fps: number): number {
  if (scene.visualPlan.elements.length > scene.beats.length) {
    let activeElement = 0;
    for (let index = 0; index < scene.visualPlan.elements.length; index += 1) {
      if (frame >= getStartFrame(scene, index, fps)) activeElement = index;
    }
    return activeElement;
  }
  const nowMs = (frame / fps) * 1000;
  const index = (scene.beats || []).findIndex((beat) => nowMs >= beat.startMs && nowMs < beat.endMs);
  return index < 0 ? 0 : index;
}

const HeroLayout: React.FC<{ scene: VideoScene; theme: VideoTheme; activeBeat: number }> = ({ scene, theme, activeBeat }) => {
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const elements = scene.visualPlan.elements.slice(0, 4);
  const focus = scene.type === 'title' ? scene.title : scene.visualPlan.focusText || scene.title;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
      <ElementReveal startFrame={Math.round(fps * 0.25)} direction="scale">
        <div style={{ display: 'inline-flex', alignSelf: isPortrait ? 'center' : 'flex-start', alignItems: 'center', gap: 12, padding: '10px 18px', borderRadius: 999, border: `1px solid ${theme.accentColor}55`, color: theme.accentColor, fontFamily: theme.fontFamily, fontSize: Math.max(18, theme.bodySize * 0.46), fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', background: `${theme.accentColor}16` }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: theme.accentColor, boxShadow: `0 0 18px ${theme.accentColor}` }} />
          Visual story
        </div>
      </ElementReveal>
      <ElementReveal startFrame={Math.round(fps * 0.48)} direction="up">
        <div
          style={{
            marginTop: 26,
            maxWidth: isPortrait ? '100%' : '84%',
            color: theme.textColor,
            fontFamily: theme.fontFamily,
            fontSize: responsiveTextSize(theme.headingSize * (isPortrait ? 1.05 : 1.16), focus, isPortrait ? 18 : 24, 0.62),
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.045em',
            textAlign: isPortrait ? 'center' : 'left',
            textWrap: 'balance',
          }}
        >
          {focus}
        </div>
      </ElementReveal>
      {(scene.subtitle || scene.visualPlan.supportingText) ? (
        <ElementReveal startFrame={Math.round(fps * 0.72)} direction="up">
          <div style={{ marginTop: 24, maxWidth: isPortrait ? '100%' : '68%', color: theme.mutedTextColor, fontFamily: theme.fontFamily, fontSize: Math.max(24, Math.round(theme.bodySize * 0.8)), lineHeight: 1.4, textAlign: isPortrait ? 'center' : 'left' }}>
            {scene.subtitle || scene.visualPlan.supportingText}
          </div>
        </ElementReveal>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: isPortrait ? 'repeat(2, minmax(0, 1fr))' : `repeat(${Math.max(1, Math.min(4, elements.length))}, minmax(0, 1fr))`, gap: 16, marginTop: isPortrait ? 42 : 36 }}>
        {elements.map((element, index) => (
          <Card key={element.id} element={element} index={index} scene={scene} theme={theme} active={index === activeBeat % Math.max(1, elements.length)} compact />
        ))}
      </div>
    </div>
  );
};

const CardsLayout: React.FC<{ scene: VideoScene; theme: VideoTheme; activeBeat: number }> = ({ scene, theme, activeBeat }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const elements = scene.visualPlan.elements.slice(0, isPortrait ? 4 : 3);
  return (
    <>
      <Header scene={scene} theme={theme} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 0 }}>
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: isPortrait ? 'repeat(2, minmax(0,1fr))' : `repeat(${Math.max(1, elements.length)}, minmax(0,1fr))`, gap: isPortrait ? 20 : 24, alignItems: 'start' }}>
          {elements.map((element, index) => (
            <Card key={element.id} element={element} index={index} scene={scene} theme={theme} active={index === activeBeat % Math.max(1, elements.length)} />
          ))}
        </div>
      </div>
    </>
  );
};

const SplitLayout: React.FC<{ scene: VideoScene; theme: VideoTheme; activeBeat: number }> = ({ scene, theme, activeBeat }) => {
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const elements = scene.visualPlan.elements.slice(0, 4);
  return (
    <>
      <Header scene={scene} theme={theme} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isPortrait ? '1fr' : '0.92fr 1.08fr', gridTemplateRows: isPortrait ? '0.82fr 1.18fr' : undefined, gap: isPortrait ? 22 : 34, minHeight: 0 }}>
        <ElementReveal startFrame={Math.round(fps * 0.45)} direction="left">
          <div style={{ ...surface(theme, true), height: '100%', borderRadius: isPortrait ? 30 : 28, padding: isPortrait ? 34 : 42, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' }}>
            {scene.imageUrl ? (
              <>
                <Img src={scene.imageUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.46 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,6,23,.18), rgba(2,6,23,.92))' }} />
              </>
            ) : null}
            <div style={{ position: 'relative', color: theme.accentColor, fontFamily: theme.fontFamily, fontSize: Math.max(18, theme.bodySize * 0.48), fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Focus</div>
            <div style={{ position: 'relative', color: theme.textColor, fontFamily: theme.fontFamily, fontWeight: 900, lineHeight: 1.1, fontSize: responsiveTextSize(theme.headingSize * 0.82, scene.visualPlan.focusText, 18, 0.7), textWrap: 'balance' }}>
              {scene.visualPlan.focusText}
            </div>
            <div style={{ position: 'relative', color: theme.mutedTextColor, fontFamily: theme.fontFamily, fontSize: Math.max(21, theme.bodySize * 0.64), lineHeight: 1.38 }}>
              {scene.visualPlan.supportingText}
            </div>
          </div>
        </ElementReveal>
        <div style={{ display: 'grid', gridTemplateColumns: isPortrait ? 'repeat(2, minmax(0,1fr))' : '1fr', gap: 16, minHeight: 0 }}>
          {elements.map((element, index) => (
            <Card key={element.id} element={element} index={index} scene={scene} theme={theme} active={index === activeBeat % Math.max(1, elements.length)} compact />
          ))}
        </div>
      </div>
    </>
  );
};

const TimelineLayout: React.FC<{ scene: VideoScene; theme: VideoTheme; activeBeat: number }> = ({ scene, theme, activeBeat }) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const isPortrait = height > width;
  const elements = scene.visualPlan.elements.slice(0, 5);
  const progress = interpolate(frame, [fps * 0.45, Math.max(fps * 0.5, scene.durationSeconds * fps * 0.82)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <Header scene={scene} theme={theme} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: isPortrait ? 'column' : 'row', alignItems: 'stretch', justifyContent: 'space-between', gap: isPortrait ? 18 : 22, minHeight: 0, padding: isPortrait ? '8px 0' : '36px 0 12px' }}>
        <div style={{ position: 'absolute', left: isPortrait ? 29 : '3%', right: isPortrait ? undefined : '3%', top: isPortrait ? '3%' : 67, bottom: isPortrait ? '3%' : undefined, width: isPortrait ? 4 : undefined, height: isPortrait ? undefined : 4, borderRadius: 99, background: 'rgba(255,255,255,.12)' }}>
          <div style={{ width: isPortrait ? '100%' : `${progress * 100}%`, height: isPortrait ? `${progress * 100}%` : '100%', borderRadius: 99, background: `linear-gradient(${isPortrait ? '180deg' : '90deg'}, ${theme.accentColor}, #67e8f9)`, boxShadow: `0 0 22px ${theme.accentColor}88` }} />
        </div>
        {elements.map((element, index) => {
          const active = index === activeBeat % Math.max(1, elements.length);
          return (
            <ElementReveal key={element.id} startFrame={getStartFrame(scene, index, fps)} direction={isPortrait ? 'left' : 'up'}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: isPortrait ? 'row' : 'column', gap: 18, alignItems: isPortrait ? 'center' : 'flex-start', paddingLeft: isPortrait ? 76 : 0, paddingTop: isPortrait ? 0 : 58, height: '100%' }}>
                <div style={{ position: 'absolute', left: isPortrait ? 16 : 18, top: isPortrait ? '50%' : 13, width: active ? 28 : 22, height: active ? 28 : 22, marginTop: isPortrait ? (active ? -14 : -11) : 0, borderRadius: 99, background: active ? theme.accentColor : theme.backgroundColor, border: `4px solid ${active ? '#fff' : theme.accentColor}`, boxShadow: active ? `0 0 28px ${theme.accentColor}` : 'none' }} />
                <div style={{ ...surface(theme, active), borderRadius: 22, padding: '24px 26px', width: '100%', height: isPortrait ? '100%' : undefined }}>
                  <div style={{ color: theme.accentColor, fontFamily: theme.fontFamily, fontSize: 19, fontWeight: 900, marginBottom: 8 }}>0{index + 1}</div>
                  <div style={{ color: theme.textColor, fontFamily: theme.fontFamily, fontSize: Math.max(24, theme.bodySize * 0.72), fontWeight: 800, lineHeight: 1.22 }}>{element.label}</div>
                  {element.description ? <div style={{ marginTop: 8, color: theme.mutedTextColor, fontFamily: theme.fontFamily, fontSize: Math.max(18, theme.bodySize * 0.5), lineHeight: 1.35 }}>{element.description}</div> : null}
                </div>
              </div>
            </ElementReveal>
          );
        })}
      </div>
    </>
  );
};

const ComparisonLayout: React.FC<{ scene: VideoScene; theme: VideoTheme; activeBeat: number }> = ({ scene, theme, activeBeat }) => {
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const elements = scene.visualPlan.elements.slice(0, 4);
  const midpoint = Math.ceil(elements.length / 2);
  const groups = [elements.slice(0, midpoint), elements.slice(midpoint)];
  return (
    <>
      <Header scene={scene} theme={theme} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isPortrait ? '1fr' : '1fr 1fr', gap: 24, minHeight: 0 }}>
        {groups.map((group, groupIndex) => (
          <ElementReveal key={groupIndex} startFrame={Math.round(fps * (0.42 + groupIndex * 0.24))} direction={groupIndex === 0 ? 'right' : 'left'}>
            <div style={{ ...surface(theme, groupIndex === activeBeat % 2), height: isPortrait ? '100%' : 'auto', minHeight: isPortrait ? 0 : 420, borderRadius: 28, padding: isPortrait ? 30 : 36, display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                <div style={{ color: groupIndex === 0 ? theme.mutedTextColor : theme.accentColor, fontFamily: theme.fontFamily, fontSize: Math.max(22, theme.bodySize * 0.58), fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {groupIndex === 0 ? 'Before' : 'After'}
                </div>
                <div style={{ width: 54, height: 2, background: groupIndex === 0 ? 'rgba(255,255,255,.22)' : theme.accentColor }} />
              </div>
              {group.map((element, index) => (
                <div key={element.id} style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: index ? 18 : 0, borderTop: index ? '1px solid rgba(255,255,255,.1)' : undefined }}>
                  <Glyph element={element} index={index + groupIndex * midpoint} theme={theme} active={groupIndex === activeBeat % 2} size={56} />
                  <div>
                    <div style={{ color: theme.textColor, fontFamily: theme.fontFamily, fontSize: Math.max(25, theme.bodySize * 0.72), fontWeight: 800, lineHeight: 1.22 }}>{element.label}</div>
                    {element.description ? <div style={{ marginTop: 7, color: theme.mutedTextColor, fontFamily: theme.fontFamily, fontSize: Math.max(18, theme.bodySize * 0.5) }}>{element.description}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </ElementReveal>
        ))}
      </div>
    </>
  );
};

const DiagramLayout: React.FC<{ scene: VideoScene; theme: VideoTheme; activeBeat: number }> = ({ scene, theme, activeBeat }) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const isPortrait = height > width;
  const elements = scene.visualPlan.elements.slice(0, 4);
  const orbit = frame * 0.12;
  return (
    <>
      <Header scene={scene} theme={theme} />
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ position: 'absolute', width: isPortrait ? '72%' : '42%', aspectRatio: '1', borderRadius: '50%', border: '2px dashed rgba(255,255,255,.13)', transform: `rotate(${orbit}deg)` }} />
        <ElementReveal startFrame={Math.round(fps * 0.42)} direction="scale">
          <div style={{ ...surface(theme, true), width: isPortrait ? 320 : 350, height: isPortrait ? 320 : 350, borderRadius: '50%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 42, position: 'relative', zIndex: 3, boxShadow: `0 0 90px ${theme.accentColor}2f, inset 0 0 46px ${theme.accentColor}18` }}>
            <div style={{ color: theme.textColor, fontFamily: theme.fontFamily, fontSize: responsiveTextSize(theme.headingSize * 0.62, scene.visualPlan.focusText, 14, 0.7), fontWeight: 900, lineHeight: 1.1, textWrap: 'balance' }}>
              {scene.visualPlan.focusText}
            </div>
          </div>
        </ElementReveal>
        {elements.map((element, index) => {
          const angle = (Math.PI * 2 * index) / Math.max(1, elements.length) - Math.PI / 2;
          const radiusX = isPortrait ? width * 0.32 : width * 0.29;
          const radiusY = isPortrait ? height * 0.23 : height * 0.26;
          const x = Math.cos(angle) * radiusX;
          const y = Math.sin(angle) * radiusY;
          const active = index === activeBeat % Math.max(1, elements.length);
          return (
            <div key={element.id} style={{ position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)', zIndex: 4, width: isPortrait ? 240 : 260 }}>
              <ElementReveal startFrame={getStartFrame(scene, index, fps)} direction="scale">
                <div style={{ ...surface(theme, active), borderRadius: 22, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Glyph element={element} index={index} theme={theme} active={active} size={52} />
                  <div style={{ color: theme.textColor, fontFamily: theme.fontFamily, fontSize: Math.max(21, theme.bodySize * 0.58), fontWeight: 800, lineHeight: 1.18 }}>{element.label}</div>
                </div>
              </ElementReveal>
            </div>
          );
        })}
      </div>
    </>
  );
};

export const VisualStage: React.FC<{ scene: VideoScene; theme: VideoTheme }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const activeBeat = activeBeatFor(scene, frame, fps);
  const layout = scene.visualPlan.layout;
  return (
    <SafeContent>
      {layout === 'hero' ? <HeroLayout scene={scene} theme={theme} activeBeat={activeBeat} /> : null}
      {layout === 'cards' ? <CardsLayout scene={scene} theme={theme} activeBeat={activeBeat} /> : null}
      {layout === 'split' ? <SplitLayout scene={scene} theme={theme} activeBeat={activeBeat} /> : null}
      {layout === 'timeline' ? <TimelineLayout scene={scene} theme={theme} activeBeat={activeBeat} /> : null}
      {layout === 'comparison' ? <ComparisonLayout scene={scene} theme={theme} activeBeat={activeBeat} /> : null}
      {layout === 'diagram' ? <DiagramLayout scene={scene} theme={theme} activeBeat={activeBeat} /> : null}
    </SafeContent>
  );
};
