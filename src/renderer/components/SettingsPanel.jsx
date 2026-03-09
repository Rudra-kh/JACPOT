import React, { useEffect, useState } from 'react'
import { Settings, X, Moon, Wifi, Smartphone, Music, Folder, Clock, Palette, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { THEMES } from '../themes'

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-start gap-4 py-3" style={{ borderBottom: '1px solid rgba(0,200,255,0.06)' }}>
      <div className="flex-1">
        <div style={{ fontSize: '0.75rem', color: '#c8eeff', fontFamily: 'Rajdhani', fontWeight: 600 }}>{label}</div>
        {description && <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', lineHeight: '1.4', marginTop: 2 }}>{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: value ? 'rgba(0,200,255,0.3)' : 'rgba(0,200,255,0.08)',
        border: `1px solid ${value ? 'rgba(0,200,255,0.5)' : 'rgba(0,200,255,0.15)'}`,
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 2, width: 14, height: 14,
          borderRadius: '50%', background: value ? '#00c8ff' : 'rgba(200,238,255,0.3)',
          left: value ? 19 : 2, transition: 'left 0.2s ease, background 0.2s ease',
          boxShadow: value ? '0 0 6px #00c8ff' : 'none',
        }}
      />
    </button>
  )
}

const DEFAULTS = {
  spotifyClientId: '',
  mobileDeviceId: '',
  phoneIp: '',
  downloadFolder: '',
  autoLaunch: false,
  metricsInterval: 2000,
  accentColor: '#00c8ff',
  // Mini Player
  mpMusixmatchKey: '',
  mpShowOnPlay: true,
  mpAutoShowOnMinimize: true,
  mpLyricsEnabled: true,
  mpDefaultMode: 'standard',
  mpDefaultOpacity: 100,
  mpIdleTimeoutMs: 10000,
}

const STORE_KEY_MAP = {
  spotifyClientId: 'spotify.clientId',
  mobileDeviceId:  'mobile.deviceId',
  phoneIp:         'mobile.phoneIp',
  downloadFolder:  'app.downloadFolder',
  autoLaunch:      'app.autoLaunch',
  metricsInterval: 'app.metricsInterval',
  accentColor:     'app.accentColor',
  // Mini Player
  mpMusixmatchKey:    'miniPlayer.musixmatchApiKey',
  mpShowOnPlay:       'miniPlayer.showOnPlay',
  mpAutoShowOnMinimize: 'miniPlayer.autoShowOnMinimize',
  mpLyricsEnabled:    'miniPlayer.lyricsEnabled',
  mpDefaultMode:      'miniPlayer.sizeMode',
  mpDefaultOpacity:   'miniPlayer.opacity',
  mpIdleTimeoutMs:    'miniPlayer.idleTimeoutMs',
}

export default function SettingsPanel() {
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const closeSettings = useAppStore((s) => s.closeSettings)
  const addToast = useAppStore((s) => s.addToast)
  const theme    = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  const [settings, setSettings] = useState(DEFAULTS)
  const [showSpotifySecret, setShowSpotifySecret] = useState(false)

  // Auto-save a single field immediately on change
  async function update(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
    await window.api?.store.set(STORE_KEY_MAP[key], value)
    if (key === 'autoLaunch') window.api?.app.setAutoLaunch(value)
  }

  async function reset() {
    await Promise.all(Object.entries(DEFAULTS).map(([k, v]) => window.api?.store.set(STORE_KEY_MAP[k], v)))
    window.api?.app.setAutoLaunch(false)
    setSettings(DEFAULTS)
    addToast({ title: 'SETTINGS', message: 'Settings reset to defaults.', type: 'info' })
  }

  useEffect(() => {
    if (!settingsOpen) return
    async function load() {
      const keys = ['spotify.clientId', 'mobile.deviceId', 'mobile.phoneIp', 'app.downloadFolder', 'app.autoLaunch', 'app.metricsInterval', 'app.accentColor',
        'miniPlayer.musixmatchApiKey', 'miniPlayer.showOnPlay', 'miniPlayer.autoShowOnMinimize', 'miniPlayer.lyricsEnabled', 'miniPlayer.sizeMode', 'miniPlayer.opacity', 'miniPlayer.idleTimeoutMs']
      const [spotifyClientId, mobileDeviceId, phoneIp, downloadFolder, autoLaunch, metricsInterval, accentColor,
        mpMusixmatchKey, mpShowOnPlay, mpAutoShowOnMinimize, mpLyricsEnabled, mpDefaultMode, mpDefaultOpacity, mpIdleTimeoutMs] = await Promise.all(
        keys.map(k => window.api?.store.get(k))
      )
      setSettings(s => ({
        ...s,
        spotifyClientId: spotifyClientId || '',
        mobileDeviceId: mobileDeviceId || '',
        phoneIp: phoneIp || '',
        downloadFolder: downloadFolder || '',
        autoLaunch: !!autoLaunch,
        metricsInterval: metricsInterval || 2000,
        accentColor: accentColor || '#00c8ff',
        mpMusixmatchKey:      mpMusixmatchKey      ?? '',
        mpShowOnPlay:         mpShowOnPlay         ?? true,
        mpAutoShowOnMinimize: mpAutoShowOnMinimize ?? true,
        mpLyricsEnabled:      mpLyricsEnabled      ?? true,
        mpDefaultMode:        mpDefaultMode        || 'standard',
        mpDefaultOpacity:     mpDefaultOpacity != null ? Math.round(mpDefaultOpacity * 100) : 100,
        mpIdleTimeoutMs:      mpIdleTimeoutMs      || 10000,
      }))
    }
    load()
  }, [settingsOpen])

  if (!settingsOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(2,12,24,0.92)' }}
      onClick={closeSettings}
    >
      <div
        className="hud-card flex flex-col"
        style={{ width: 520, maxHeight: '85vh', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(0,200,255,0.1)' }}>
          <Settings size={14} style={{ color: '#00c8ff' }} />
          <span className="hud-label" style={{ fontSize: '0.65rem', flex: 1 }}>SETTINGS</span>
          <button onClick={closeSettings} style={{ color: 'rgba(200,238,255,0.3)' }}><X size={14} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-2">

          {/* ── Spotify ── */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 mt-2">
              <Music size={11} style={{ color: '#00c8ff' }} />
              <span className="hud-label-sm">SPOTIFY</span>
            </div>
            <SettingRow
              label="Client ID"
              description="Spotify Developer App Client ID. Register at developer.spotify.com."
            >
              <div className="flex items-center gap-1">
                <input
                  className="hud-input"
                  style={{ width: 200, fontSize: '0.65rem', padding: '3px 6px' }}
                  type={showSpotifySecret ? 'text' : 'password'}
                  value={settings.spotifyClientId}
                  onChange={e => update('spotifyClientId', e.target.value)}
                  placeholder="Your client ID..."
                />
                <button onClick={() => setShowSpotifySecret(v => !v)} style={{ color: 'rgba(200,238,255,0.4)' }}>
                  {showSpotifySecret ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
              </div>
            </SettingRow>
          </div>

          {/* ── Mobile ── */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 mt-2">
              <Smartphone size={11} style={{ color: '#00c8ff' }} />
              <span className="hud-label-sm">MOBILE / KDE CONNECT</span>
            </div>
            <SettingRow label="Device ID" description="KDE Connect device ID (run kdeconnect-cli -l --id-only).">
              <input
                className="hud-input"
                style={{ width: 200, fontSize: '0.65rem', padding: '3px 6px' }}
                value={settings.mobileDeviceId}
                onChange={e => update('mobileDeviceId', e.target.value)}
                placeholder="e.g. abc123def456..."
              />
            </SettingRow>
            <SettingRow label="Phone IP" description="For IP Webcam camera stream (e.g. 192.168.1.100).">
              <input
                className="hud-input"
                style={{ width: 200, fontSize: '0.65rem', padding: '3px 6px' }}
                value={settings.phoneIp}
                onChange={e => update('phoneIp', e.target.value)}
                placeholder="192.168.x.x"
              />
            </SettingRow>
          </div>

          {/* ── Appearance ── */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 mt-2">
              <Palette size={11} style={{ color: '#00c8ff' }} />
              <span className="hud-label-sm">APPEARANCE</span>
            </div>
            <SettingRow label="Theme" description="Select the HUD color scheme.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {Object.entries(THEMES).map(([key, thm]) => {
                  const isActive = key === theme
                  return (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      title={thm.name}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '6px 4px',
                        background: isActive ? `${thm.primary}14` : 'transparent',
                        border: `1px solid ${isActive ? thm.primary : 'rgba(200,238,255,0.1)'}`,
                        borderRadius: 4, cursor: 'pointer', outline: 'none',
                        transition: 'all 0.15s',
                        boxShadow: isActive ? `0 0 10px ${thm.primary}44` : 'none',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = thm.primary; e.currentTarget.style.background = `${thm.primary}10` }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isActive ? thm.primary : 'rgba(200,238,255,0.1)'; e.currentTarget.style.background = isActive ? `${thm.primary}14` : 'transparent' }}
                    >
                      {/* Color swatch circle */}
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `radial-gradient(circle at 35% 35%, ${thm.accent}, ${thm.primary} 55%, ${thm.secondary})`,
                        boxShadow: isActive ? `0 0 8px ${thm.primary}, 0 0 2px ${thm.primary}` : 'none',
                        border: `1.5px solid ${thm.primary}88`,
                        flexShrink: 0,
                      }} />
                      {/* Name */}
                      <span style={{
                        fontFamily: 'Orbitron', fontSize: 7, letterSpacing: 1,
                        color: isActive ? thm.primary : 'rgba(200,238,255,0.5)',
                        textShadow: isActive ? `0 0 6px ${thm.primary}` : 'none',
                        whiteSpace: 'nowrap',
                      }}>{thm.name}</span>
                    </button>
                  )
                })}
              </div>
            </SettingRow>
          </div>

          {/* ── Mini Player ── */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 mt-2">
              <Music size={11} style={{ color: '#00c8ff' }} />
              <span className="hud-label-sm">MINI PLAYER</span>
            </div>
            <SettingRow label="Show when Spotify plays" description="Automatically show the mini player when music starts.">
              <Toggle value={settings.mpShowOnPlay} onChange={v => update('mpShowOnPlay', v)} />
            </SettingRow>
            <SettingRow label="Show on dashboard minimize" description="Pop the mini player when the main window is minimized.">
              <Toggle value={settings.mpAutoShowOnMinimize} onChange={v => update('mpAutoShowOnMinimize', v)} />
            </SettingRow>
            <SettingRow label="Lyrics ticker" description="Show synced lyrics in Standard and Expanded modes.">
              <Toggle value={settings.mpLyricsEnabled} onChange={v => update('mpLyricsEnabled', v)} />
            </SettingRow>
            <SettingRow label="Musixmatch API key" description="Free key from developer.musixmatch.com — enables lyrics.">
              <input
                className="hud-input"
                style={{ width: 200, fontSize: '0.65rem', padding: '3px 6px' }}
                type="password"
                value={settings.mpMusixmatchKey}
                onChange={e => update('mpMusixmatchKey', e.target.value)}
                placeholder="Your API key..."
              />
            </SettingRow>
            <SettingRow label="Default size mode" description="Starting window size when the mini player opens.">
              <select
                className="hud-input"
                style={{ width: 120, fontSize: '0.65rem', padding: '3px 6px', background: 'rgba(0,20,40,0.8)', color: '#c8eeff' }}
                value={settings.mpDefaultMode}
                onChange={e => update('mpDefaultMode', e.target.value)}
              >
                <option value="nano">Nano (280×50)</option>
                <option value="standard">Standard (380×100)</option>
                <option value="expanded">Expanded (380×220)</option>
              </select>
            </SettingRow>
            <SettingRow label="Idle opacity" description="Window opacity after 10 s of inactivity (0–100%).">
              <input
                className="hud-input"
                style={{ width: 70, fontSize: '0.65rem', padding: '3px 6px' }}
                type="number" min={20} max={100} step={5}
                value={settings.mpDefaultOpacity}
                onChange={e => update('mpDefaultOpacity', +e.target.value)}
              />
            </SettingRow>
            <SettingRow label="Controls" description="Shortcut: Ctrl+Shift+M to toggle.">
              <div className="flex items-center gap-2">
                <button className="hud-btn" style={{ fontSize: '0.6rem', padding: '3px 8px' }}
                  onClick={() => window.api?.miniPlayer.show()}>SHOW</button>
                <button className="hud-btn" style={{ fontSize: '0.6rem', padding: '3px 8px' }}
                  onClick={() => window.api?.miniPlayer.hide()}>HIDE</button>
                <button className="hud-btn" style={{ fontSize: '0.6rem', padding: '3px 8px' }}
                  onClick={() => window.api?.miniPlayer.resetPosition()}>RESET POS</button>
              </div>
            </SettingRow>
          </div>

          {/* ── App ── */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 mt-2">
              <Settings size={11} style={{ color: '#00c8ff' }} />
              <span className="hud-label-sm">APPLICATION</span>
            </div>
            <SettingRow label="Auto-launch on startup" description="Start JACPOTE when Windows starts.">
              <Toggle value={settings.autoLaunch} onChange={v => update('autoLaunch', v)} />
            </SettingRow>
            <SettingRow label="Download folder" description="Default folder for received files from phone.">
              <input
                className="hud-input"
                style={{ width: 200, fontSize: '0.65rem', padding: '3px 6px' }}
                value={settings.downloadFolder}
                onChange={e => update('downloadFolder', e.target.value)}
                placeholder="~/Downloads/JACPOTE"
              />
            </SettingRow>
            <SettingRow label="Metrics poll interval" description="How often to refresh system metrics (ms).">
              <input
                className="hud-input"
                style={{ width: 80, fontSize: '0.65rem', padding: '3px 6px' }}
                type="number"
                min={500}
                max={10000}
                step={500}
                value={settings.metricsInterval}
                onChange={e => update('metricsInterval', +e.target.value)}
              />
            </SettingRow>
            <SettingRow label="Accent color" description="Primary HUD accent color.">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={e => update('accentColor', e.target.value)}
                  style={{ width: 30, height: 20, cursor: 'pointer', background: 'none', border: 'none' }}
                />
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                  {settings.accentColor}
                </span>
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(0,200,255,0.08)' }}>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', flex: 1 }}>
            JACPOTE v1.0.0 — Build 2026.03.03
          </span>
          <button className="hud-btn danger" onClick={reset}>RESET</button>
          <button className="hud-btn" onClick={closeSettings}>CLOSE</button>
        </div>
      </div>
    </div>
  )
}
