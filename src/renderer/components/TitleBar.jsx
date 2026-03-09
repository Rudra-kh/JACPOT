import React from 'react'
import { Minus, Square, X, Zap } from 'lucide-react'
import { useAppStore } from '../store/appStore'

export default function TitleBar() {
  const openPalette = useAppStore((s) => s.openPalette)

  const minimize = () => window.api?.window.minimize()
  const maximize = () => window.api?.window.maximize()
  const close    = () => window.api?.window.close()

  return (
    <div
      className="flex items-center justify-between px-4 select-none"
      style={{
        height: '38px',
        background: 'rgba(0,0,0,0.5)',
        borderBottom: '1px solid rgba(0,200,255,0.08)',
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="status-dot cyan" />
        <span className="hud-label" style={{ fontSize: '0.7rem', letterSpacing: '0.25em' }}>JACPOTE</span>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', letterSpacing: '0.15em' }}>
          COMMAND CENTER v1.0
        </span>
      </div>

      {/* Center: Command palette trigger */}
      <button
        onClick={openPalette}
        className="flex items-center gap-2 px-4 py-1 transition-all duration-200"
        style={{
          background: 'rgba(0,200,255,0.04)',
          border: '1px solid rgba(0,200,255,0.12)',
          borderRadius: '999px',
          color: 'rgba(200,238,255,0.4)',
          WebkitAppRegion: 'no-drag',
          cursor: 'pointer',
          boxShadow: 'inset 0 0 10px rgba(0,200,255,0.03)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.3)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(0,200,255,0.15)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.12)'; e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(0,200,255,0.03)'; }}
      >
        <Zap size={10} style={{ color: '#00c8ff' }} />
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.62rem', color: 'rgba(200,238,255,0.35)' }}>
          Search commands... Ctrl+Space
        </span>
      </button>

      {/* Right: Window controls — circular */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={minimize}
          className="flex items-center justify-center transition-all duration-200"
          style={{ width: 24, height: 24, borderRadius: '50%', color: 'rgba(200,238,255,0.4)', border: '1px solid rgba(0,200,255,0.1)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#c8eeff'; e.currentTarget.style.borderColor = 'rgba(0,200,255,0.4)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(0,200,255,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(200,238,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(0,200,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Minus size={10} />
        </button>
        <button
          onClick={maximize}
          className="flex items-center justify-center transition-all duration-200"
          style={{ width: 24, height: 24, borderRadius: '50%', color: 'rgba(200,238,255,0.4)', border: '1px solid rgba(0,200,255,0.1)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#c8eeff'; e.currentTarget.style.borderColor = 'rgba(0,200,255,0.4)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(0,200,255,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(200,238,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(0,200,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Square size={9} />
        </button>
        <button
          onClick={close}
          className="flex items-center justify-center transition-all duration-200"
          style={{ width: 24, height: 24, borderRadius: '50%', color: 'rgba(200,238,255,0.4)', border: '1px solid rgba(255,68,68,0.15)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.borderColor = 'rgba(255,68,68,0.5)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255,68,68,0.3)'; e.currentTarget.style.background = 'rgba(255,68,68,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(200,238,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,68,68,0.15)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'transparent'; }}
        >
          <X size={10} />
        </button>
      </div>
    </div>
  )
}
