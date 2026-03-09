import React, { useEffect, useState, useRef } from 'react'
import { Wifi, Globe, Shield, Plus, Edit2, Trash2, Play, Eye, EyeOff, X } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

function NetworkModal({ entry, onSave, onClose }) {
  const [form, setForm] = useState(entry || { ssid: '', url: '', username: '', password: '' })
  const [showPass, setShowPass] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,12,24,0.85)' }}>
      <div className="hud-card p-4" style={{ width: 360 }}>
        <div className="flex items-center justify-between mb-4">
          <span className="hud-label" style={{ fontSize: '0.65rem' }}>{entry ? 'EDIT NETWORK' : 'ADD NETWORK'}</span>
          <button onClick={onClose} style={{ color: 'rgba(200,238,255,0.4)' }}><X size={14} /></button>
        </div>
        <div className="space-y-3">
          {['ssid', 'url', 'username'].map((field) => (
            <div key={field}>
              <label className="hud-label-sm block mb-1" style={{ fontSize: '0.55rem' }}>{field.toUpperCase()}</label>
              <input
                className="hud-input w-full"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                placeholder={field === 'url' ? 'http://portal.example.com' : ''}
              />
            </div>
          ))}
          <div>
            <label className="hud-label-sm block mb-1" style={{ fontSize: '0.55rem' }}>PASSWORD</label>
            <div className="flex items-center gap-1">
              <input
                className="hud-input flex-1"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button onClick={() => setShowPass(!showPass)} style={{ color: 'rgba(200,238,255,0.4)', padding: 4 }}>
                {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="hud-btn flex-1" onClick={() => onSave(form)}>SAVE</button>
            <button className="hud-btn danger" onClick={onClose}>CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AutoHotspot() {
  const network = useAppStore((s) => s.network)
  const setNetwork = useAppStore((s) => s.setNetwork)
  const addToast = useAppStore((s) => s.addToast)
  const [savedNetworks, setSavedNetworks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [ping, setPing] = useState(null)

  useEffect(() => {
    loadNetworks()
    // Listen for network status updates
    const cleanup = window.api?.network.onStatus((data) => {
      const local = data.ifaces?.find(i => i.addrs?.some(a => a.family === 'IPv4' && !a.internal))
      const ip = local?.addrs?.find(a => a.family === 'IPv4' && !a.internal)?.address
      setNetwork({ ip, gateway: data.gateway })
    })
    return cleanup
  }, [])

  async function loadNetworks() {
    const nets = await window.api?.store.get('hotspot.networks') || []
    setSavedNetworks(nets)
  }

  async function saveNetworks(nets) {
    await window.api?.store.set('hotspot.networks', nets)
    setSavedNetworks(nets)
  }

  async function handleSave(form) {
    const nets = [...savedNetworks]
    const idx = nets.findIndex(n => n.ssid === form.ssid)
    if (idx >= 0) nets[idx] = form; else nets.push(form)
    await saveNetworks(nets)
    setShowModal(false)
    setEditEntry(null)
  }

  async function handleDelete(ssid) {
    await saveNetworks(savedNetworks.filter(n => n.ssid !== ssid))
  }

  async function handleLogin(entry) {
    const result = await window.api?.network.autoLogin({
      url: entry.url,
      username: entry.username,
      password: entry.password,
    })
    if (result?.ok) {
      addToast({ title: 'HOTSPOT', message: `Auto-logged in to ${entry.ssid}`, type: 'success' })
    } else {
      addToast({ title: 'HOTSPOT', message: `Login failed: ${result?.error || 'unknown'}`, type: 'error' })
    }
  }

  return (
    <>
      {showModal && (
        <NetworkModal
          entry={editEntry}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditEntry(null) }}
        />
      )}

      <WidgetCard id="hotspot" title="AUTO HOTSPOT LOGIN" icon={Wifi}>
        <div className="space-y-3">
          {/* Current network */}
          <div>
            <div className="hud-label-sm mb-2" style={{ fontSize: '0.55rem' }}>CURRENT CONNECTION</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>IP ADDRESS</div>
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.68rem', color: '#c8eeff' }}>
                  {network.ip || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>GATEWAY</div>
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.68rem', color: '#c8eeff' }}>
                  {network.gateway || '—'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(0,200,255,0.06)' }} />

          {/* Saved networks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="hud-label-sm" style={{ fontSize: '0.55rem' }}>SAVED PORTALS</div>
              <button
                className="hud-btn flex items-center gap-1"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.55rem' }}
                onClick={() => { setEditEntry(null); setShowModal(true) }}
              >
                <Plus size={9} /> ADD
              </button>
            </div>

            {savedNetworks.length === 0 ? (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', textAlign: 'center', padding: '8px 0' }}>
                No portals saved
              </div>
            ) : (
              <div className="space-y-1.5">
                {savedNetworks.map((n) => (
                  <div
                    key={n.ssid}
                    className="flex items-center gap-2 p-2 rounded"
                    style={{ background: 'rgba(0,200,255,0.03)', border: '1px solid rgba(0,200,255,0.06)' }}
                  >
                    <Globe size={11} style={{ color: '#00c8ff', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: '0.7rem', color: '#c8eeff', fontFamily: 'Rajdhani', fontWeight: 600 }}>{n.ssid}</div>
                      <div className="truncate" style={{ fontSize: '0.58rem', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono' }}>{n.username}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLogin(n)}
                        className="hover:text-white transition-colors"
                        style={{ color: '#00c8ff', padding: 2 }}
                        title="Login now"
                      >
                        <Play size={10} />
                      </button>
                      <button
                        onClick={() => { setEditEntry(n); setShowModal(true) }}
                        style={{ color: 'rgba(200,238,255,0.3)', padding: 2 }}
                        className="hover:text-white transition-colors"
                      >
                        <Edit2 size={10} />
                      </button>
                      <button
                        onClick={() => handleDelete(n.ssid)}
                        style={{ color: 'rgba(255,68,68,0.5)', padding: 2 }}
                        className="hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 p-2 rounded" style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.1)' }}>
            <Shield size={10} style={{ color: '#ffd700', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.58rem', color: 'rgba(255,215,0,0.6)', fontFamily: 'Rajdhani', lineHeight: '1.4' }}>
              Credentials encrypted with machine-unique key via AES. Store not portable.
            </span>
          </div>
        </div>
      </WidgetCard>
    </>
  )
}
