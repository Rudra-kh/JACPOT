import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import BootScreen from './components/BootScreen'
import Dashboard from './components/Dashboard'
import ToastContainer from './components/ToastContainer'
import CommandPalette from './components/CommandPalette'
import SettingsPanel from './components/SettingsPanel'

export default function App() {
  const booted = useAppStore((s) => s.booted)
  const setBooted = useAppStore((s) => s.setBooted)
  const openPalette = useAppStore((s) => s.openPalette)
  const setMetrics = useAppStore((s) => s.setMetrics)

  // Subscribe to system metrics from main process
  useEffect(() => {
    const cleanup = window.api?.system.onMetrics((data) => setMetrics(data))
    return () => cleanup?.()
  }, [])

  // Listen for global command palette trigger from main process
  useEffect(() => {
    const cleanup = window.api?.on('global:command-palette', () => openPalette())
    return cleanup
  }, [])

  // Keyboard shortcut handler
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {!booted && <BootScreen onComplete={setBooted} />}
      {booted && (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clipboard-overlay" element={<ClipboardOverlay />} />
          <Route path="/notes-overlay"     element={<NotesOverlay />} />
        </Routes>
      )}
      <ToastContainer />
      <CommandPalette />
      <SettingsPanel />
    </>
  )
}

// Minimal overlay components for floating windows
function ClipboardOverlay() {
  const { default: ClipboardManager } = require('./widgets/ClipboardManager')
  return (
    <div style={{ background: 'rgba(2,12,24,0.95)', minHeight: '100vh', padding: 8 }}>
      <ClipboardManager />
    </div>
  )
}

function NotesOverlay() {
  const { default: QuickNotes } = require('./widgets/QuickNotes')
  return (
    <div style={{ background: 'rgba(2,12,24,0.95)', minHeight: '100vh', padding: 8 }}>
      <QuickNotes />
    </div>
  )
}
