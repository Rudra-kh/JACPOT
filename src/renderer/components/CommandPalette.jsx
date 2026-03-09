import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { Search, Activity, Music, Clipboard, StickyNote, Smartphone, MessageSquare, X } from 'lucide-react'

const COMMANDS = [
  { id: 'sys',   label: 'View System Monitor',    category: 'Navigate', view: 'system',    Icon: Activity },
  { id: 'spot',  label: 'Open Spotify Player',    category: 'Navigate', view: 'spotify',   Icon: Music },
  { id: 'clip',  label: 'Open Clipboard Manager', category: 'Navigate', view: 'clipboard', Icon: Clipboard },
  { id: 'notes', label: 'Open Quick Notes',       category: 'Navigate', view: 'notes',     Icon: StickyNote },
  { id: 'mob',   label: 'Open Mobile Hub',        category: 'Navigate', view: 'mobile',    Icon: Smartphone },
  { id: 'sms',   label: 'Open SMS Viewer',        category: 'Navigate', view: 'sms',       Icon: MessageSquare },
]

export default function CommandPalette() {
  const paletteOpen = useAppStore((s) => s.paletteOpen)
  const closePalette = useAppStore((s) => s.closePalette)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (paletteOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [paletteOpen])

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closePalette() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!paletteOpen) return null

  const filtered = COMMANDS.filter(
    (c) => !query || c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (cmd) => {
    if (cmd.view) { setActiveView(cmd.view) }
    closePalette()
  }

  return (
    <div className="palette-backdrop" onClick={closePalette}>
      <div
        className="hud-card"
        style={{ width: '560px', maxHeight: '420px', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: 'rgba(0,200,255,0.12)' }}>
          <Search size={16} style={{ color: '#00c8ff', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, notes, tracks..."
            className="flex-1 bg-transparent outline-none"
            style={{
              fontFamily: 'Share Tech Mono',
              fontSize: '0.85rem',
              color: '#c8eeff',
              border: 'none',
            }}
          />
          <button onClick={closePalette} style={{ color: 'rgba(200,238,255,0.3)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
          {filtered.length === 0 && (
            <div className="p-4 text-center" style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontFamily: 'Rajdhani' }}>
              No commands found
            </div>
          )}
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
              style={{ borderRadius: 8 }}
              onClick={() => handleSelect(cmd)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Circular icon ring */}
              <div className="ring-icon-sm" style={{ flexShrink: 0 }}>
                <cmd.Icon size={11} style={{ color: '#00c8ff' }} />
              </div>
              <div className="flex-1">
                <div style={{ fontSize: '0.85rem', color: '#c8eeff', fontFamily: 'Rajdhani', fontWeight: 600 }}>
                  {cmd.label}
                </div>
              </div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'Orbitron', letterSpacing: '0.08em',
                background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.12)',
                padding: '0.1rem 0.4rem', borderRadius: 999 }}>
                {cmd.category}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2 text-xs border-t"
          style={{ borderColor: 'rgba(0,200,255,0.08)', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono', fontSize: '0.6rem' }}
        >
          <span><kbd className="px-1 py-0.5 rounded" style={{ border: '1px solid rgba(200,238,255,0.15)' }}>↵</kbd> select</span>
          <span><kbd className="px-1 py-0.5 rounded" style={{ border: '1px solid rgba(200,238,255,0.15)' }}>ESC</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
