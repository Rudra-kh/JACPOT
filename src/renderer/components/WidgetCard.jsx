import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '../store/appStore'

/**
 * Reusable HUD widget card — circular arc aesthetic
 * Corner brackets, circular icon ring, radial header accent
 */
export default function WidgetCard({ id, title, icon: Icon, badge, children, className = '', headerExtra }) {
  const collapsed = useAppStore((s) => s.collapsed[id])
  const toggleCollapsed = useAppStore((s) => s.toggleCollapsed)

  return (
    <div className={`hud-card arc-corners flex flex-col ${className}`}>
      {/* Arc corner bracket marks - disabled by request
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />
      */}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        style={{
          borderBottom: collapsed ? 'none' : '1px solid rgba(0,200,255,0.07)',
          position: 'relative',
          zIndex: 2,
        }}
        onClick={() => toggleCollapsed(id)}
      >
        {/* Circular icon ring */}
        {Icon && (
          <div className="ring-icon-sm">
            <Icon size={11} style={{ color: '#00c8ff' }} />
          </div>
        )}

        {/* Title */}
        <span className="hud-label-sm flex-1" style={{ fontSize: '0.6rem' }}>{title}</span>

        {/* Badge pill */}
        {badge && (
          <span style={{
            fontSize: '0.55rem',
            fontFamily: 'Share Tech Mono',
            color: '#020c18',
            background: '#00c8ff',
            padding: '0.1rem 0.45rem',
            borderRadius: '999px',
            boxShadow: '0 0 6px rgba(0,200,255,0.5)',
          }}>
            {badge}
          </span>
        )}

        {headerExtra}

        <div style={{ color: 'rgba(200,238,255,0.22)', flexShrink: 0 }}>
          {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
        </div>
      </div>

      {/* Radial arc glow line under header */}
      {!collapsed && (
        <div style={{ position: 'relative', height: 1, overflow: 'hidden', zIndex: 2, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute',
            left: '50%', transform: 'translateX(-50%)',
            width: '70%', height: 1,
            background: 'radial-gradient(ellipse at center, rgba(0,200,255,0.5) 0%, transparent 70%)',
          }} />
        </div>
      )}

      {/* Body */}
      <div
        className="widget-body"
        style={{ maxHeight: collapsed ? '0px' : '9999px', opacity: collapsed ? 0 : 1, position: 'relative', zIndex: 2 }}
      >
        <div className="p-3">{children}</div>
      </div>
    </div>
  )
}
