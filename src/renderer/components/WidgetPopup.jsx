import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import SystemMonitor from '../widgets/SystemMonitor'
import SpotifyWidget from '../widgets/SpotifyWidget'
import MobileHub from '../widgets/MobileHub'
import AutoHotspot from '../widgets/AutoHotspot'
import ClipboardManager from '../widgets/ClipboardManager'
import QuickNotes from '../widgets/QuickNotes'
import FileTransfer from '../widgets/FileTransfer'
import RemoteCamera from '../widgets/RemoteCamera'
import SMSViewer from '../widgets/SMSViewer'

const PANEL_CONTENT = {
  system:    { title: 'System Monitor',  icon: '⚡', component: <SystemMonitor /> },
  spotify:   { title: 'Spotify',         icon: '🎵', component: <SpotifyWidget /> },
  mobile:    { title: 'Mobile Hub',      icon: '📱', component: <MobileHub /> },
  hotspot:   { title: 'Auto Hotspot',    icon: '📡', component: <AutoHotspot /> },
  clipboard: { title: 'Clipboard',       icon: '📋', component: <ClipboardManager /> },
  notes:     { title: 'Quick Notes',     icon: '📝', component: <QuickNotes /> },
  transfer:  { title: 'File Transfer',   icon: '📂', component: <FileTransfer /> },
  camera:    { title: 'Remote Camera',   icon: '📷', component: <RemoteCamera /> },
  sms:       { title: 'SMS Viewer',      icon: '💬', component: <SMSViewer /> },
}

const PANEL_SIDE = {
  system: 'right', spotify: 'right', clipboard: 'right',
  mobile: 'left',  hotspot: 'left',  notes: 'left', sms: 'left',
  transfer: 'center', camera: 'center',
}

/* ─── Techy border with hatched zones & solid corner ──────────────── */
function PanelBorderSVG({ W, CUT_TL, CUT_S }) {
  // We need to draw a path that follows the border:
  // TL: solid triangle corner.
  // Edges: lines with gaps for hatched zones.
  // This is a custom drawing matching the reference image.
  
  const C = '#00ffff'
  // Coordinates based on W (width) and variable Height if needed, but here height is fixed 100% via viewBox
  // Actually we need Y coordinates. We'll use H=600 as the base design height.

  return (
    <svg
      width="100%" height="100%"
      preserveAspectRatio="none"
      viewBox={`0 0 ${W} 600`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}
    >
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={C} strokeWidth="2" opacity="0.6" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      
      {/* ─── Top-Left Solid Triangle Corner ─── */}
      <path d={`M 0 0 L ${CUT_TL} 0 L 0 ${CUT_TL} Z`} fill={C} filter="url(#glow)" />
      
      {/* ─── Main Outline ─── */}
      {/* Starting after TL corner, going clockwise */}
      <path
        d={`
          M ${CUT_TL + 4} 0 
          L ${W - CUT_S - 100} 0 
          M ${W - CUT_S} 0 
          L ${W} ${CUT_S} 
          L ${W} ${600 - CUT_S} 
          L ${W - CUT_S} 600
          L ${CUT_S + 100} 600
          M ${CUT_S} 600
          L 0 ${600 - CUT_S}
          L 0 ${CUT_TL + 4}
        `}
        fill="none" stroke={C} strokeWidth="2" vectorEffect="non-scaling-stroke"
        filter="url(#glow)"
      />

      {/* ─── Hatched Zones (Decorations) ─── */}
      {/* Top Left (next to main corner) */}
      <path d={`M ${CUT_TL + 10} 6 L ${CUT_TL + 80} 6 L ${CUT_TL + 70} 16 L ${CUT_TL + 10} 16 Z`} fill="url(#hatch)" stroke={C} strokeWidth="1" />
      
      {/* Top Right */}
      <path d={`M ${W - 120} 6 L ${W - CUT_S - 10} 6 L ${W - CUT_S - 20} 16 L ${W - 130} 16 Z`} fill="url(#hatch)" stroke={C} strokeWidth="1" />

      {/* Bottom Right */}
      <path d={`M ${W - 120} 594 L ${W - CUT_S - 10} 594 L ${W - CUT_S - 20} 584 L ${W - 130} 584 Z`} fill="url(#hatch)" stroke={C} strokeWidth="1" />

      {/* ─── Circuit Line on Left ─── */}
      <path
        d={`M 10 ${CUT_TL + 20} L 10 ${600 - CUT_S - 40} L 25 ${600 - CUT_S - 25}`}
        fill="none" stroke={C} strokeWidth="1.5" vectorEffect="non-scaling-stroke"
      />
      <circle cx="10" cy={CUT_TL + 20} r="3" fill={C} />
    </svg>
  )
}

/* ─── Main popup ─────────────────────────────────────────────── */
export default function WidgetPopup() {
  const activePanel = useAppStore((s) => s.activePanel)
  const closePanel  = useAppStore((s) => s.closePanel)

  // Drag state: null = use default side-based position
  const [pos, setPos] = useState(null)
  const panelRef = useRef(null)

  // Reset position whenever a new panel opens
  useEffect(() => { setPos(null) }, [activePanel])

  function onHeaderMouseDown(e) {
    if (e.button !== 0) return
    if (e.target.closest('button')) return
    e.preventDefault()

    const rect = panelRef.current.getBoundingClientRect()
    const initialPos = { x: rect.left, y: rect.top }
    // Switch to pixel coords immediately — eliminates jump on first move
    setPos(initialPos)

    const startX = e.clientX
    const startY = e.clientY

    function onMove(e) {
      setPos({
        x: initialPos.x + e.clientX - startX,
        y: initialPos.y + e.clientY - startY,
      })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') closePanel()
  }, [closePanel])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!activePanel || !PANEL_CONTENT[activePanel]) return null

  const { title, icon, component } = PANEL_CONTENT[activePanel]
  const side = PANEL_SIDE[activePanel] || 'right'

  const W = 490
  const CUT_TL = 60 // Top Left big cut
  const CUT_S  = 30 // Other corners small cut

  // Explicit polygon for content masking
  // Matches the frame shape:
  // 0,0 is cut by TL triangle 0,60 -> 60,0
  // TR is cut 460,0 -> 490,30
  // BR is cut 490,570 -> 460,600
  // BL is cut 30,600 -> 0,570
  const clipPath = `polygon(
    ${CUT_TL}px 0px,
    ${W - CUT_S}px 0px,
    ${W}px ${CUT_S}px,
    ${W}px calc(100% - ${CUT_S}px),
    calc(100% - ${CUT_S}px) 100%,
    ${CUT_S}px 100%,
    0px calc(100% - ${CUT_S}px),
    0px ${CUT_TL}px
  )`

  const posStyle = pos
    ? { left: pos.x, top: pos.y }
    : {
        ...{
          left:   { left: 55 },
          right:  { right: 8 },
          center: { left: '50%' },
        }[side],
        top: '50%',
      }
  const transformStyle = pos
    ? 'none'
    : side === 'center' ? 'translate(-50%, -50%)' : 'translateY(-50%)'
  const slideAnim = side === 'left' ? 'hudSlideLeft' : side === 'right' ? 'hudSlideRight' : 'hudSlideUp'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closePanel}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(6px)',
          zIndex: 200,
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Main Panel Wrapper */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          width: W,
          ...posStyle,
          transform: transformStyle,
          zIndex: 202,
          // Only animate on initial open; suppress once pos is set so re-renders don't restart it
          animation: pos ? 'none' : `${slideAnim} 0.25s cubic-bezier(0.18,0.9,0.32,1.08) both`,
          height: 600,
          maxHeight: '90vh',
        }}
      >
        {/* Glow behind */}
        <div style={{
          position: 'absolute', inset: 0,
          clipPath,
          boxShadow: '0 0 100px rgba(0,255,255,0.15)',
          background: 'transparent',
          pointerEvents: 'none',
        }} />

        {/* Clipped Content Background */}
        <div
          style={{
            position: 'absolute', inset: 0,
            clipPath,
            background: 'rgba(3, 15, 28, 0.97)', 
            border: '1px solid rgba(0,255,255,0.1)',
          }}
        >
          {/* Inner Header — drag handle */}
          <div
            onMouseDown={onHeaderMouseDown}
            style={{
              position: 'relative', zIndex: 2,
              display: 'flex', alignItems: 'center', gap: 12,
              padding: `22px ${CUT_S + 40}px 12px ${CUT_TL + 12}px`,
              flexShrink: 0,
              cursor: 'grab',
              userSelect: 'none',
            }}>
             <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '1.5px solid rgba(0,200,255,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, background: 'rgba(0,200,255,0.09)',
              boxShadow: '0 0 10px rgba(0,200,255,0.2)',
              flexShrink: 0, padding: 0, lineHeight: 0,
            }}>
              {icon}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 9, color: 'rgba(0,200,255,0.45)', letterSpacing: 3, fontFamily: 'Orbitron' }}>
                MODULE
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#00e8ff', letterSpacing: 2, fontFamily: 'Orbitron' }}>
                {title.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div style={{ 
            position: 'absolute', top: 76, bottom: 40, left: 22, right: 22,
            overflowY: 'auto',
          }}>
            {component}
          </div>

          {/* Footer Text */}
          <div style={{
            position: 'absolute', bottom: 12, left: 30, right: 30,
            display: 'flex', justifyContent: 'space-between',
            fontSize: 9, color: 'rgba(0,255,255,0.4)',
            fontFamily: 'Orbitron', letterSpacing: 2,
          }}>
            <span>SYSTEM READY</span>{/* Removed right text */}
          </div>
        </div>

        {/* SVG Border Overlay */}
        <PanelBorderSVG W={W} CUT_TL={CUT_TL} CUT_S={CUT_S} />

        {/* Close Button - Shifted Inwards */}
        <button
          onClick={closePanel}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 30,
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #00ffff',
            color: '#00ffff',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: '0 0 10px rgba(0,255,255,0.3)',
            padding: 0, lineHeight: 0,
          }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: '#00ffff', color: '#000' })}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: 'rgba(0,0,0,0.5)', color: '#00ffff' })}
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes hudSlideRight {
          from { opacity: 0; transform: translateY(-50%) translateX(44px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes hudSlideLeft {
          from { opacity: 0; transform: translateY(-50%) translateX(-44px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes hudSlideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 32px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  )
}
