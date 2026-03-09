import React from 'react'
import { useAppStore } from '../store/appStore'
import { THEMES } from '../themes'
import ironManGif from '../../../assets/f889323d87ae92dbd5da3b1193708dc3.gif'

/* ─── Sci-Fi Frame border SVG (same style as WidgetPopup) ─── */
function HUDFrameBorder({ W, H, CUT_TL, CUT_S, color }) {
  const C = color
  const HV = H // viewBox height

  return (
    <svg
      width="100%" height="100%"
      preserveAspectRatio="none"
      viewBox={`0 0 ${W} ${HV}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}
    >
      <defs>
        <pattern id="lp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={C} strokeWidth="2" opacity="0.55" />
        </pattern>
        <filter id="lp-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Top-Left Solid Triangle ── */}
      <path d={`M 0 0 L ${CUT_TL} 0 L 0 ${CUT_TL} Z`} fill={C} filter="url(#lp-glow)" />

      {/* ── Main Outline ── */}
      <path
        d={`
          M ${CUT_TL + 4} 0
          L ${W - CUT_S} 0
          L ${W} ${CUT_S}
          L ${W} ${HV - CUT_S}
          L ${W - CUT_S} ${HV}
          L ${CUT_S} ${HV}
          L 0 ${HV - CUT_S}
          L 0 ${CUT_TL + 4}
        `}
        fill="none" stroke={C} strokeWidth="1.5" vectorEffect="non-scaling-stroke"
        filter="url(#lp-glow)"
      />

      {/* ── Hatched accent — Top Right ── */}
      <path d={`M ${W - 100} 6 L ${W - CUT_S - 6} 6 L ${W - CUT_S - 14} 16 L ${W - 110} 16 Z`}
        fill="url(#lp-hatch)" stroke={C} strokeWidth="1" />

      {/* ── Hatched accent — Bottom Left ── */}
      <path d={`M ${CUT_S + 6} ${HV - 6} L ${CUT_S + 100} ${HV - 6} L ${CUT_S + 90} ${HV - 16} L ${CUT_S + 6} ${HV - 16} Z`}
        fill="url(#lp-hatch)" stroke={C} strokeWidth="1" />

      {/* ── Hatched accent — Bottom Right ── */}
      <path d={`M ${W - 100} ${HV - 6} L ${W - CUT_S - 6} ${HV - 6} L ${W - CUT_S - 14} ${HV - 16} L ${W - 110} ${HV - 16} Z`}
        fill="url(#lp-hatch)" stroke={C} strokeWidth="1" />

      {/* ── Circuit line along left edge ── */}
      <path
        d={`M 10 ${CUT_TL + 16} L 10 ${HV - CUT_S - 30} L 22 ${HV - CUT_S - 18}`}
        fill="none" stroke={C} strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.6"
      />
      <circle cx="10" cy={CUT_TL + 16} r="2.5" fill={C} opacity="0.9" />
    </svg>
  )
}

/* ─── Left Side Panel ─── */
export default function LeftSidePanel() {
  const theme = useAppStore((s) => s.theme)
  const t = THEMES[theme] ?? THEMES.cyan
  const C = t.primary

  const W = 360    // panel width in px (used for clip-path calc)
  const CUT_TL = 40
  const CUT_S  = 20
  const VB_H   = 800  // SVG viewBox height — large enough

  const clipPath = `polygon(
    ${CUT_TL}px 0px,
    calc(100% - ${CUT_S}px) 0px,
    100% ${CUT_S}px,
    100% calc(100% - ${CUT_S}px),
    calc(100% - ${CUT_S}px) 100%,
    ${CUT_S}px 100%,
    0px calc(100% - ${CUT_S}px),
    0px ${CUT_TL}px
  )`

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      height: '100%',
      width: W,
      flexShrink: 0,
    }}>
      {/* ── Large sci-fi framed window ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        flex: 1,        // fill remaining vertical space
        minHeight: 0,
      }}>
        {/* Clipped background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          clipPath,
          background: `linear-gradient(160deg, rgba(0,8,18,0.96) 0%, rgba(0,4,12,0.98) 100%)`,
          // Subtle scanline texture
          backgroundImage: `
            linear-gradient(160deg, rgba(0,8,18,0.96) 0%, rgba(0,4,12,0.98) 100%),
            repeating-linear-gradient(0deg, transparent, transparent 3px, ${C}08 3px, ${C}08 4px)
          `,
        }} />

        {/* Outer glow layer */}
        <div style={{
          position: 'absolute',
          inset: 0,
          clipPath,
          boxShadow: `inset 0 0 40px ${C}0a, 0 0 30px ${C}0d`,
          pointerEvents: 'none',
        }} />

        {/* SVG Sci-Fi border */}
        <HUDFrameBorder W={W} H={VB_H} CUT_TL={CUT_TL} CUT_S={CUT_S} color={C} />

        {/* ── Content area — inset 3px so image never touches the border stroke ── */}
        <div style={{
          position: 'absolute',
          inset: 3,
          clipPath: `polygon(
            ${CUT_TL - 2}px 0px,
            calc(100% - ${CUT_S - 1}px) 0px,
            100% ${CUT_S - 1}px,
            100% calc(100% - ${CUT_S - 1}px),
            calc(100% - ${CUT_S - 1}px) 100%,
            ${CUT_S - 1}px 100%,
            0px calc(100% - ${CUT_S - 1}px),
            0px ${CUT_TL - 2}px
          )`,
          zIndex: 5,
          overflow: 'hidden',
        }}>
          <img
              src={ironManGif}
              alt="Iron Man"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
        </div>
      </div>
    </div>
  )
}
