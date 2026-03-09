import React from 'react'
import { useAppStore } from '../store/appStore'
import {
  LayoutDashboard, Activity, Music, Smartphone, Wifi,
  Clipboard, StickyNote, FolderUp, Camera, MessageSquare, Settings
} from 'lucide-react'

const DOCK_ITEMS = [
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

export default function BottomDock() {
  const activePanel  = useAppStore((s) => s.activePanel)
  const openPanel    = useAppStore((s) => s.openPanel)
  const closePanel   = useAppStore((s) => s.closePanel)
  const openSettings = useAppStore((s) => s.openSettings)

  return (
    <div className="hud-dock">
      {DOCK_ITEMS.map(({ id, Icon, label }) => {
        const active = id === 'dashboard'
          ? activePanel === null // dashboard = no panel open
          : activePanel === id
        return (
          <button
            key={id}
            title={label}
            onClick={() => {
              if (id === 'dashboard') { closePanel(); return }
              if (activePanel === id) { closePanel(); return }
              openPanel(id)
            }}
            className={`dock-btn ${active ? 'active' : ''}`}
          >
            <Icon size={16} />
            {/* Label below icon */}
            <span style={{
              fontFamily: 'Orbitron',
              fontSize: '0.36rem',
              letterSpacing: '0.05em',
              color: active ? '#00c8ff' : 'rgba(200,238,255,0.3)',
              lineHeight: 1,
            }}>
              {label.slice(0, 5).toUpperCase()}
            </span>
          </button>
        )
      })}

      {/* Separator */}
      <div style={{ width: 1, height: 32, background: 'rgba(0,200,255,0.12)', margin: '0 4px' }} />

      {/* Settings button */}
      <button
        title="Settings"
        onClick={openSettings}
        className="dock-btn"
        style={{ border: '1px solid rgba(0,200,255,0.12)' }}
      >
        <Settings size={16} />
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.36rem', letterSpacing: '0.05em', color: 'rgba(200,238,255,0.25)' }}>
          SET
        </span>
      </button>
    </div>
  )
}
