import React from 'react'
import { useAppStore } from '../store/appStore'
import {
  Activity, Music, Smartphone, Wifi, Clipboard,
  StickyNote, FolderUp, Camera, MessageSquare, Settings, LayoutDashboard
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard',  Icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'system',     Icon: Activity,        label: 'System' },
  { id: 'spotify',    Icon: Music,           label: 'Spotify' },
  { id: 'mobile',     Icon: Smartphone,      label: 'Mobile' },
  { id: 'hotspot',    Icon: Wifi,            label: 'Network' },
  { id: 'clipboard',  Icon: Clipboard,       label: 'Clipboard' },
  { id: 'notes',      Icon: StickyNote,      label: 'Notes' },
  { id: 'transfer',   Icon: FolderUp,        label: 'Transfer' },
  { id: 'camera',     Icon: Camera,          label: 'Camera' },
  { id: 'sms',        Icon: MessageSquare,   label: 'SMS' },
]

export default function SidebarRail() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const openSettings = useAppStore((s) => s.openSettings)

  return (
    <div
      className="flex flex-col items-center py-4 gap-1"
      style={{
        width: '52px',
        background: 'rgba(0,0,0,0.35)',
        borderRight: '1px solid rgba(0,200,255,0.08)',
        height: '100vh',
      }}
    >
      {/* Logo dot */}
      <div className="mb-4 flex flex-col items-center gap-1">
        <div
          style={{
            width: 28, height: 28,
            borderRadius: '50%',
            border: '2px solid rgba(0,200,255,0.5)',
            background: 'rgba(0,200,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div className="status-dot cyan" style={{ width: 8, height: 8 }} />
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ id, Icon, label }) => {
          const active = activeView === id
          return (
            <button
              key={id}
              title={label}
              onClick={() => setActiveView(id)}
              className="group relative flex items-center justify-center transition-all duration-200"
              style={{
                width: 36, height: 36,
                borderRadius: '50%',
                color: active ? '#00c8ff' : 'rgba(200,238,255,0.28)',
                background: active ? 'rgba(0,200,255,0.1)' : 'transparent',
                border: active ? '1px solid rgba(0,200,255,0.45)' : '1px solid rgba(0,200,255,0.08)',
                boxShadow: active
                  ? '0 0 12px rgba(0,200,255,0.35), inset 0 0 8px rgba(0,200,255,0.08)'
                  : 'none',
              }}
            >
              <Icon size={14} />
              {/* Active ring pulse */}
              {active && (
                <span style={{
                  position: 'absolute', inset: -4,
                  borderRadius: '50%',
                  border: '1px solid rgba(0,200,255,0.2)',
                  pointerEvents: 'none',
                  animation: 'rotateRing 6s linear infinite',
                }} />
              )}
              {/* Tooltip */}
              <span
                className="absolute left-12 z-50 px-2 py-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: 'rgba(2,12,24,0.95)',
                  border: '1px solid rgba(0,200,255,0.2)',
                  borderRadius: 6,
                  color: '#c8eeff',
                  fontFamily: 'Rajdhani',
                  whiteSpace: 'nowrap',
                  fontSize: '0.7rem',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Settings */}
      <button
        title="Settings"
        onClick={openSettings}
        className="flex items-center justify-center transition-all duration-200"
        style={{
          width: 36, height: 36,
          borderRadius: '50%',
          color: 'rgba(200,238,255,0.28)',
          border: '1px solid rgba(0,200,255,0.08)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.3)'; e.currentTarget.style.color = '#00c8ff'; e.currentTarget.style.boxShadow = '0 0 10px rgba(0,200,255,0.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.08)'; e.currentTarget.style.color = 'rgba(200,238,255,0.28)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <Settings size={14} />
      </button>
    </div>
  )
}
