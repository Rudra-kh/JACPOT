import React, { useEffect, useState, useCallback, useRef } from 'react'
import { StickyNote, Plus, Search, Pin, Archive, Trash2, ExternalLink, Download, X, ChevronRight } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

const NOTE_COLORS = [
  { id: 'cyan',   label: 'Cyan',   hex: '#00c8ff' },
  { id: 'orange', label: 'Orange', hex: '#ff6b2b' },
  { id: 'green',  label: 'Green',  hex: '#00ff88' },
  { id: 'purple', label: 'Purple', hex: '#a855f7' },
  { id: 'red',    label: 'Red',    hex: '#ff4444' },
]

function relativeTime(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

function NoteCard({ note, onEdit, onPin, onDelete, onArchive, onFloat, onExport }) {
  const [hover, setHover] = useState(false)
  const colorDef = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0]

  return (
    <div
      className="hud-card cursor-pointer transition-all duration-200"
      style={{
        borderLeft: `3px solid ${colorDef.hex}`,
        boxShadow: hover ? `0 0 12px rgba(${colorDef.hex.replace('#','').match(/../g).map(h=>parseInt(h,16)).join(',')},0.2)` : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDoubleClick={() => onFloat(note.id)}
    >
      <div className="p-2">
        {/* Title */}
        <div className="flex items-start gap-1.5 mb-1">
          <div
            style={{
              flex: 1,
              fontSize: '0.72rem',
              color: colorDef.hex,
              fontFamily: 'Orbitron',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textShadow: `0 0 8px ${colorDef.hex}60`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {note.title || note.body?.split('\n')[0]?.slice(0, 30) || 'Untitled'}
          </div>
          {note.pinned ? <Pin size={8} style={{ color: colorDef.hex, flexShrink: 0, marginTop: 2 }} fill={colorDef.hex} /> : null}
        </div>

        {/* Body preview */}
        <div
          style={{
            fontSize: '0.65rem',
            color: 'var(--text-dim)',
            fontFamily: 'Rajdhani',
            lineHeight: '1.4',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {note.body || <span style={{ fontStyle: 'italic' }}>Empty note</span>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-1.5">
          <span style={{ fontSize: '0.5rem', color: 'rgba(200,238,255,0.25)', fontFamily: 'Share Tech Mono' }}>
            {relativeTime(note.updated_at)}
          </span>
          {hover && (
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => onPin(note)} title="Pin" style={{ color: note.pinned ? colorDef.hex : 'rgba(200,238,255,0.3)', padding: 2 }}>
                <Pin size={8} />
              </button>
              <button onClick={() => onEdit(note)} title="Edit" style={{ color: 'rgba(200,238,255,0.3)', padding: 2 }} className="hover:text-white">
                <ChevronRight size={8} />
              </button>
              <button onClick={() => onExport(note.id, 'md')} title="Export .md" style={{ color: 'rgba(200,238,255,0.3)', padding: 2 }} className="hover:text-white">
                <Download size={8} />
              </button>
              <button onClick={() => onArchive(note)} title="Archive" style={{ color: 'rgba(200,238,255,0.3)', padding: 2 }} className="hover:text-white">
                <Archive size={8} />
              </button>
              <button onClick={() => onDelete(note.id)} title="Delete" style={{ color: 'rgba(255,68,68,0.5)', padding: 2 }} className="hover:text-red-400">
                <Trash2 size={8} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NoteEditor({ note, onSave, onClose }) {
  const [form, setForm] = useState(note || { title: '', body: '', color: 'cyan' })
  const bodyRef = useRef(null)

  useEffect(() => {
    bodyRef.current?.focus()
  }, [])

  function handleSave() {
    onSave({
      ...form,
      title: form.title || form.body.split('\n')[0]?.slice(0, 40) || 'Untitled',
    })
    onClose()
  }

  const colorDef = NOTE_COLORS.find(c => c.id === form.color) || NOTE_COLORS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,12,24,0.9)' }}>
      <div
        className="hud-card flex flex-col"
        style={{ width: 520, maxHeight: '80vh', borderLeft: `3px solid ${colorDef.hex}` }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(0,200,255,0.08)' }}>
          <input
            className="flex-1 bg-transparent outline-none"
            style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', color: colorDef.hex, letterSpacing: '0.05em' }}
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="NOTE TITLE"
          />
          <button onClick={onClose} style={{ color: 'rgba(200,238,255,0.3)' }}><X size={14} /></button>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b" style={{ borderColor: 'rgba(0,200,255,0.06)' }}>
          {NOTE_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setForm({ ...form, color: c.id })}
              style={{
                width: 12, height: 12, borderRadius: '50%',
                background: c.hex,
                border: form.color === c.id ? `2px solid white` : '2px solid transparent',
                boxShadow: form.color === c.id ? `0 0 6px ${c.hex}` : 'none',
              }}
            />
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>DOUBLE-CLICK A NOTE TO FLOAT IT</span>
        </div>

        {/* Body */}
        <textarea
          ref={bodyRef}
          className="flex-1 p-3 bg-transparent outline-none resize-none"
          style={{
            fontFamily: 'Rajdhani', fontSize: '0.82rem', color: '#c8eeff',
            lineHeight: '1.6', minHeight: 200,
          }}
          value={form.body}
          onChange={e => setForm({ ...form, body: e.target.value })}
          placeholder="Start writing..."
        />

        {/* Footer */}
        <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: 'rgba(0,200,255,0.08)' }}>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono' }}>
            {form.body.length} chars
          </span>
          <div className="flex gap-1 ml-auto">
            <button className="hud-btn" onClick={handleSave}>SAVE</button>
            <button className="hud-btn danger" onClick={onClose}>DISCARD</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QuickNotes() {
  const notesSearch = useAppStore((s) => s.notesSearch)
  const setNotesSearch = useAppStore((s) => s.setNotesSearch)
  const addToast = useAppStore((s) => s.addToast)
  const [notes, setNotes] = useState([])
  const [editNote, setEditNote] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(async () => {
    const data = await window.api?.notes.getAll()
    if (data) setNotes(data)
  }, [])

  useEffect(() => {
    load()
    // Global new-note shortcut
    const cleanup = window.api?.on('global:new-note', () => {
      setEditNote(null)
      setShowEditor(true)
    })
    return cleanup
  }, [])

  const filtered = notes.filter(n =>
    (showArchived ? n.archived : !n.archived) &&
    (!notesSearch || (n.title || '').toLowerCase().includes(notesSearch.toLowerCase()) || n.body.toLowerCase().includes(notesSearch.toLowerCase()))
  )

  async function handleSave(note) {
    await window.api?.notes.save(note)
    load()
    addToast({ title: 'NOTES', message: 'Note saved.', type: 'success' })
  }

  async function handlePin(note) {
    await window.api?.notes.save({ ...note, pinned: !note.pinned })
    load()
  }

  async function handleDelete(id) {
    await window.api?.notes.delete(id)
    load()
  }

  async function handleArchive(note) {
    await window.api?.notes.save({ ...note, archived: !note.archived })
    load()
  }

  function handleFloat(id) {
    window.api?.notes.openFloat(id)
  }

  function handleExport(id, fmt) {
    window.api?.notes.export(id, fmt)
  }

  return (
    <>
      {showEditor && (
        <NoteEditor
          note={editNote}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditNote(null) }}
        />
      )}

      <WidgetCard
        id="notes"
        title="QUICK NOTES"
        icon={StickyNote}
        badge={filtered.length > 0 ? `${filtered.length}` : null}
        headerExtra={
          <button
            onClick={(e) => { e.stopPropagation(); setEditNote(null); setShowEditor(true) }}
            className="hud-btn flex items-center gap-1"
            style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem' }}
          >
            <Plus size={8} /> NEW
          </button>
        }
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-2">
          <Search size={11} style={{ color: 'rgba(200,238,255,0.3)', flexShrink: 0 }} />
          <input
            className="hud-input flex-1"
            style={{ padding: '3px 6px', fontSize: '0.7rem' }}
            placeholder="Search notes..."
            value={notesSearch}
            onChange={e => setNotesSearch(e.target.value)}
          />
          <button
            onClick={() => setShowArchived(a => !a)}
            style={{ fontSize: '0.55rem', color: showArchived ? '#00c8ff' : 'rgba(200,238,255,0.3)', fontFamily: 'Orbitron', letterSpacing: '0.08em', padding: '2px 4px' }}
          >
            {showArchived ? 'ACTIVE' : 'ARCHIVE'}
          </button>
        </div>

        {/* Grid */}
        <div className="notes-masonry overflow-y-auto" style={{ maxHeight: '420px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', columnSpan: 'all' }}>
              {showArchived ? 'No archived notes' : 'No notes yet. Press + to create one.'}
            </div>
          ) : (
            filtered.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                onEdit={(note) => { setEditNote(note); setShowEditor(true) }}
                onPin={handlePin}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onFloat={handleFloat}
                onExport={handleExport}
              />
            ))
          )}
        </div>
      </WidgetCard>
    </>
  )
}
