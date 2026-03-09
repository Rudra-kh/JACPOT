import React, { useEffect, useState, useRef, useCallback } from 'react'
import { FolderUp, Upload, Download, CheckCircle, XCircle, Clock, ArrowUp, ArrowDown, HardDrive } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

function TransferRow({ t }) {
  const icon = t.direction === 'up' ? <ArrowUp size={10} style={{ color: '#ff6b2b' }} /> : <ArrowDown size={10} style={{ color: '#00c8ff' }} />
  const statusColor = t.status === 'completed' ? '#00ff88' : t.status === 'failed' ? '#ff4444' : '#ffd700'
  const date = new Date(t.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-center gap-2 py-1.5" style={{ borderBottom: '1px solid rgba(0,200,255,0.04)' }}>
      {icon}
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: '0.68rem', color: '#c8eeff', fontFamily: 'Rajdhani' }}>{t.filename}</div>
        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono' }}>
          {t.size ? `${(t.size / (1024 * 1024)).toFixed(2)} MB` : '—'} · {date}
        </div>
      </div>
      <div style={{ color: statusColor, flexShrink: 0 }}>
        {t.status === 'completed' ? <CheckCircle size={11} /> : t.status === 'failed' ? <XCircle size={11} /> : <Clock size={11} />}
      </div>
    </div>
  )
}

export default function FileTransfer() {
  const mobile = useAppStore((s) => s.mobile)
  const addToast = useAppStore((s) => s.addToast)
  const [history, setHistory] = useState([])
  const [activeTransfers, setActiveTransfers] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const dropRef = useRef(null)

  const loadHistory = useCallback(async () => {
    const data = await window.api?.transfers.getHistory()
    if (data) setHistory(data)
  }, [])

  useEffect(() => {
    loadHistory()
    const cleanup = window.api?.transfers.onProgress((data) => {
      setActiveTransfers(prev => {
        const idx = prev.findIndex(t => t.id === data.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...data }; return n }
        return [...prev, data]
      })
      if (data.status === 'completed' || data.status === 'failed') {
        setTimeout(() => {
          setActiveTransfers(prev => prev.filter(t => t.id !== data.id))
          loadHistory()
        }, 2000)
      }
    })
    return cleanup
  }, [])

  async function handleDropFiles(e) {
    e.preventDefault()
    setDragOver(false)
    if (!mobile.connected || !mobile.deviceId) {
      addToast({ title: 'TRANSFER', message: 'No mobile device connected.', type: 'warning' })
      return
    }
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      const result = await window.api?.mobile.sendFile({ deviceId: mobile.deviceId, filePath: file.path })
      if (result?.ok) {
        await window.api?.transfers.save({
          filename: file.name, size: file.size, direction: 'up', status: 'completed', ts: Date.now()
        })
        addToast({ title: 'TRANSFER', message: `Sent: ${file.name}`, type: 'success' })
      } else {
        addToast({ title: 'TRANSFER', message: `Failed: ${file.name}`, type: 'error' })
      }
    }
    loadHistory()
  }

  return (
    <WidgetCard id="transfer" title="FILE TRANSFER" icon={FolderUp}>
      <div className="space-y-3">
        {/* Drop zone */}
        <div
          ref={dropRef}
          className="flex flex-col items-center justify-center gap-2 rounded transition-all duration-200"
          style={{
            height: 80,
            border: `2px dashed ${dragOver ? 'rgba(0,200,255,0.6)' : 'rgba(0,200,255,0.15)'}`,
            background: dragOver ? 'rgba(0,200,255,0.06)' : 'transparent',
            cursor: 'pointer',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDropFiles}
        >
          <Upload size={20} style={{ color: dragOver ? '#00c8ff' : 'rgba(0,200,255,0.3)' }} />
          <span style={{ fontSize: '0.65rem', color: dragOver ? '#00c8ff' : 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
            {dragOver ? 'DROP TO SEND TO PHONE' : 'Drag files here to send to phone'}
          </span>
        </div>

        {/* Active transfers */}
        {activeTransfers.length > 0 && (
          <div>
            <div className="hud-label-sm mb-1.5" style={{ fontSize: '0.55rem' }}>IN PROGRESS</div>
            {activeTransfers.map(t => (
              <div key={t.id} className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="truncate" style={{ fontSize: '0.65rem', color: '#c8eeff', fontFamily: 'Rajdhani', maxWidth: '70%' }}>{t.filename}</span>
                  <span style={{ fontSize: '0.58rem', fontFamily: 'Share Tech Mono', color: '#ffd700' }}>{t.progress || 0}%</span>
                </div>
                <div className="metric-bar-track">
                  <div className="metric-bar-fill orange-bar" style={{ width: `${t.progress || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(0,200,255,0.06)' }} />

        {/* Transfer history */}
        <div>
          <div className="hud-label-sm mb-1.5" style={{ fontSize: '0.55rem' }}>TRANSFER HISTORY</div>
          <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
                No transfers yet
              </div>
            ) : (
              history.map(t => <TransferRow key={t.id} t={t} />)
            )}
          </div>
        </div>
      </div>
    </WidgetCard>
  )
}
