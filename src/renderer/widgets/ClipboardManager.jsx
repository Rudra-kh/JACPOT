import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Clipboard, Search, Pin, Trash2, Tag, Eye, EyeOff, Image, FileText, X, Trash } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

function relativeTime(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ClipEntry({ entry, onCopy, onPin, onDelete, onTag }) {
  const [reveal, setReveal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showTag, setShowTag] = useState(false)
  const [tagInput, setTagInput] = useState(entry.tags || '')

  async function handleCopy() {
    await onCopy(entry)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const isPassword = entry.masked === 1
  const content = isPassword && !reveal
    ? '••••••••••••'
    : entry.type === 'text'
    ? entry.content.slice(0, 120) + (entry.content.length > 120 ? '…' : '')
    : null

  return (
    <div
      className="group relative rounded transition-all duration-150 cursor-pointer"
      style={{
        background: 'rgba(0,200,255,0.025)',
        border: `1px solid ${entry.pinned ? 'rgba(0,200,255,0.25)' : 'rgba(0,200,255,0.06)'}`,
        padding: '6px 8px',
        marginBottom: 4,
      }}
      onClick={handleCopy}
    >
      {/* Copied flash */}
      {copied && (
        <div
          className="absolute inset-0 rounded flex items-center justify-center z-10"
          style={{ background: 'rgba(0,200,255,0.15)', pointerEvents: 'none' }}
        >
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', color: '#00c8ff', letterSpacing: '0.15em' }}>COPIED!</span>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-1">
        {entry.type === 'image' ? (
          <Image size={9} style={{ color: '#a855f7', flexShrink: 0 }} />
        ) : (
          <FileText size={9} style={{ color: '#00c8ff', flexShrink: 0 }} />
        )}
        {isPassword && <span style={{ fontSize: '0.5rem', color: '#ffd700', fontFamily: 'Orbitron', letterSpacing: '0.1em' }}>PWD</span>}
        {entry.tags && entry.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
          <span key={t} style={{ fontSize: '0.5rem', color: '#00c8ff', background: 'rgba(0,200,255,0.1)', borderRadius: 2, padding: '0 3px', fontFamily: 'Rajdhani' }}>
            {t}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.5rem', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono' }}>
          {relativeTime(entry.ts)}
        </span>
      </div>

      {/* Content */}
      {entry.type === 'image' ? (
        <img src={entry.content} alt="clip" style={{ width: '100%', maxHeight: 60, objectFit: 'cover', borderRadius: 2, opacity: 0.8 }} />
      ) : (
        <div style={{ fontSize: '0.7rem', color: isPassword && !reveal ? '#c8eeff' : 'var(--text)', fontFamily: 'Share Tech Mono', lineHeight: '1.4', wordBreak: 'break-all' }}>
          {content}
        </div>
      )}

      {/* Action row (visible on hover) */}
      <div
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
        onClick={e => e.stopPropagation()}
      >
        {isPassword && (
          <button
            onClick={() => setReveal(r => !r)}
            style={{ color: 'rgba(200,238,255,0.4)', padding: 2 }}
            className="hover:text-white"
          >
            {reveal ? <EyeOff size={9} /> : <Eye size={9} />}
          </button>
        )}
        <button onClick={() => onPin(entry.id, !entry.pinned)} style={{ color: entry.pinned ? '#00c8ff' : 'rgba(200,238,255,0.4)', padding: 2 }} className="hover:text-white">
          <Pin size={9} fill={entry.pinned ? '#00c8ff' : 'none'} />
        </button>
        <button onClick={() => setShowTag(s => !s)} style={{ color: 'rgba(200,238,255,0.4)', padding: 2 }} className="hover:text-white">
          <Tag size={9} />
        </button>
        <button onClick={() => onDelete(entry.id)} style={{ color: 'rgba(255,68,68,0.5)', padding: 2 }} className="hover:text-red-400">
          <Trash2 size={9} />
        </button>
      </div>

      {/* Tag input */}
      {showTag && (
        <div className="mt-1.5 flex gap-1" onClick={e => e.stopPropagation()}>
          <input
            className="hud-input flex-1"
            style={{ padding: '2px 6px', fontSize: '0.65rem' }}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="code, address..."
            onKeyDown={e => { if (e.key === 'Enter') { onTag(entry.id, tagInput); setShowTag(false) } }}
          />
          <button className="hud-btn" style={{ padding: '2px 6px', fontSize: '0.55rem' }} onClick={() => { onTag(entry.id, tagInput); setShowTag(false) }}>
            OK
          </button>
        </div>
      )}
    </div>
  )
}

export default function ClipboardManager() {
  const clipSearch = useAppStore((s) => s.clipSearch)
  const setClipSearch = useAppStore((s) => s.setClipSearch)
  const addToast = useAppStore((s) => s.addToast)
  const [entries, setEntries] = useState([])

  const load = useCallback(async () => {
    const data = await window.api?.clipboard.getHistory()
    if (data) setEntries(data)
  }, [])

  useEffect(() => {
    load()
    const cleanup = window.api?.clipboard.onNewEntry(() => load())
    return cleanup
  }, [])

  const filtered = entries.filter(e =>
    !clipSearch || e.content.toLowerCase().includes(clipSearch.toLowerCase()) || (e.tags || '').toLowerCase().includes(clipSearch.toLowerCase())
  )

  async function handleCopy(entry) {
    if (entry.type === 'text') {
      await window.api?.clipboard.write(entry.content)
    }
  }

  async function handlePin(id, pinned) {
    await window.api?.clipboard.pin(id, pinned)
    load()
  }

  async function handleDelete(id) {
    await window.api?.clipboard.delete(id)
    load()
  }

  async function handleTag(id, tags) {
    await window.api?.clipboard.tag(id, tags)
    load()
  }

  async function handleClearAll() {
    await window.api?.clipboard.clearUnpinned()
    load()
    addToast({ title: 'CLIPBOARD', message: 'Unpinned history cleared.', type: 'info' })
  }

  return (
    <WidgetCard
      id="clipboard"
      title="CLIPBOARD MANAGER"
      icon={Clipboard}
      badge={filtered.length > 0 ? `${filtered.length}` : null}
      headerExtra={
        <button
          onClick={(e) => { e.stopPropagation(); handleClearAll() }}
          style={{ color: 'rgba(255,68,68,0.5)', padding: '0 4px' }}
          className="hover:text-red-400 transition-colors"
          title="Clear unpinned"
        >
          <Trash size={10} />
        </button>
      }
    >
      {/* Search */}
      <div className="flex items-center gap-2 mb-2">
        <Search size={11} style={{ color: 'rgba(200,238,255,0.3)', flexShrink: 0 }} />
        <input
          className="hud-input flex-1"
          style={{ padding: '3px 6px', fontSize: '0.7rem' }}
          placeholder="Search clipboard..."
          value={clipSearch}
          onChange={(e) => setClipSearch(e.target.value)}
        />
        {clipSearch && (
          <button onClick={() => setClipSearch('')} style={{ color: 'rgba(200,238,255,0.3)' }}>
            <X size={10} />
          </button>
        )}
      </div>

      {/* Entries */}
      <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
            No clipboard entries
          </div>
        ) : (
          filtered.map(e => (
            <ClipEntry
              key={e.id}
              entry={e}
              onCopy={handleCopy}
              onPin={handlePin}
              onDelete={handleDelete}
              onTag={handleTag}
            />
          ))
        )}
      </div>
    </WidgetCard>
  )
}
