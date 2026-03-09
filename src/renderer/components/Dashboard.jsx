import React, { useEffect } from 'react'
import TitleBar from './TitleBar'
import BottomDock from './BottomDock'
import HUDCenter from './HUDCenter'
import HUDLeftPanel from './HUDLeftPanel'
import HUDRightPanel from './HUDRightPanel'
import WidgetPopup from './WidgetPopup'
import LeftSidePanel from './LeftSidePanel'
import { THEMES } from '../themes'
import { useAppStore } from '../store/appStore'

export default function Dashboard() {
  const theme = useAppStore((s) => s.theme)
  const t = THEMES[theme] ?? THEMES.cyan

  // Inject CSS custom properties for theming
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--hud-primary',   t.primary)
    r.setProperty('--hud-secondary', t.secondary)
    r.setProperty('--hud-accent',    t.accent)
    r.setProperty('--hud-glow',      t.glow)
    r.setProperty('--hud-bg',        t.bg)
  }, [theme, t])

  return (
    <div
      className="bg-dot-grid text-white select-none"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
    >
      {/* ── Title Bar ── */}
      <TitleBar />

      {/* ── Main body ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Background radial glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,200,255,0.04) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* ── Iron Man HUD layout always visible ── */}
        <div
          style={{
            height: '100%', padding: '8px 10px',
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start',
            gap: 20,
          }}
        >
          {/* Left — Theme selector + sci-fi info panel */}
          <LeftSidePanel />

          {/* Center — large sci-fi HUD, fills remaining space centered */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' }}>
            <HUDCenter />
          </div>
        </div>

        {/* ── Popup overlay (portal-like) ── */}
        <WidgetPopup />
      </div>

      {/* ── Bottom dock ── */}
      <BottomDock />
    </div>
  )
}

