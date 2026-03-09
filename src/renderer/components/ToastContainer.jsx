import React, { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'

const ICONS = {
  info: <Info size={14} className="mt-0.5" />,
  success: <CheckCircle size={14} className="mt-0.5" style={{ color: '#00ff88' }} />,
  warning: <AlertTriangle size={14} className="mt-0.5" style={{ color: '#ffd700' }} />,
  error: <AlertCircle size={14} className="mt-0.5" style={{ color: '#ff4444' }} />,
}

function Toast({ id, title, message, type }) {
  const removeToast = useAppStore((s) => s.removeToast)

  return (
    <div
      className="toast-enter flex items-start gap-3 p-3 mb-2 hud-card"
      style={{
        width: '300px',
        borderColor: type === 'error' ? 'rgba(255,68,68,0.4)' : type === 'success' ? 'rgba(0,255,136,0.3)' : type === 'warning' ? 'rgba(255,215,0,0.3)' : 'rgba(0,200,255,0.2)',
      }}
    >
      <div style={{ color: type === 'info' ? '#00c8ff' : undefined, flexShrink: 0 }}>
        {ICONS[type] || ICONS.info}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <div className="hud-label-sm mb-0.5" style={{ fontSize: '0.6rem' }}>{title}</div>
        )}
        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>{message}</div>
      </div>
      <button
        onClick={() => removeToast(id)}
        style={{ color: 'rgba(200,238,255,0.3)', flexShrink: 0 }}
        className="hover:text-white transition-colors mt-0.5"
      >
        <X size={12} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)
  const addToast = useAppStore((s) => s.addToast)

  // Listen for toasts from main process
  useEffect(() => {
    if (!window.api?.on) return
    const cleanup = window.api.on('toast:show', (data) => {
      addToast(data)
    })
    return cleanup
  }, [])

  if (!toasts.length) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col items-end"
      style={{ pointerEvents: 'none' }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <Toast {...t} />
        </div>
      ))}
    </div>
  )
}
