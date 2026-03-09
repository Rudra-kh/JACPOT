import React, { useEffect, useState, useCallback } from 'react'
import { Smartphone, Battery, Bell, RefreshCw, Wifi, QrCode, Copy, CheckCircle } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

function BatteryBar({ level }) {
  const color = level > 50 ? '#00ff88' : level > 20 ? '#ffd700' : '#ff4444'
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 28, height: 14, border: `1.5px solid ${color}`, borderRadius: 3, position: 'relative', display: 'flex', alignItems: 'center', padding: '2px' }}>
        <div style={{ position: 'absolute', right: -4, top: 3, bottom: 3, width: 3, background: color, borderRadius: '0 2px 2px 0' }} />
        <div style={{ height: '100%', width: `${level}%`, background: color, borderRadius: 1, transition: 'width 0.5s ease', boxShadow: `0 0 4px ${color}` }} />
      </div>
      <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.7rem', color }}>{level}%</span>
    </div>
  )
}

export default function MobileHub() {
  const mobile    = useAppStore((s) => s.mobile)
  const setMobile = useAppStore((s) => s.setMobile)
  const addToast  = useAppStore((s) => s.addToast)
  const [qrDataUrl, setQrDataUrl]     = useState(null)
  const [serverInfo, setServerInfo]   = useState(null)
  const [showQR, setShowQR]           = useState(false)
  const [phoneStatus, setPhoneStatus] = useState(null) // live status from phone

  // Load server info + QR on mount
  useEffect(() => {
    window.api?.mobile.getQR().then(setQrDataUrl)
    window.api?.mobile.getServerInfo().then(setServerInfo)
  }, [])

  // Listen for phone connection events
  useEffect(() => {
    const unsub1 = window.api?.mobile.onConnected((data) => {
      setMobile({ connected: true, deviceName: data.name, battery: data.battery })
      addToast({ title: 'MOBILE', message: `${data.name || 'Phone'} connected.`, type: 'success' })
    })
    const unsub2 = window.api?.mobile.onDisconnected(() => {
      setMobile({ connected: false })
      setPhoneStatus(null)
    })
    const unsub3 = window.api?.mobile.onStatus((data) => {
      setPhoneStatus(data)
      setMobile({ battery: data.battery, connected: true })
    })
    return () => { unsub1?.(); unsub2?.(); unsub3?.() }
  }, [])

  // Periodic poll to sync connected state
  const poll = useCallback(async () => {
    const s = await window.api?.mobile.getStatus()
    if (s) setMobile({ connected: s.connected })
  }, [])

  useEffect(() => {
    poll()
    const iv = setInterval(poll, 5000)
    return () => clearInterval(iv)
  }, [poll])

  async function handleRing() {
    const res = await window.api?.mobile.ring()
    addToast({ title: 'MOBILE', message: res?.ok ? 'Ring sent to phone.' : 'Phone not connected.', type: res?.ok ? 'info' : 'warning' })
  }

  async function handleLock() {
    const res = await window.api?.mobile.sendCommand({ type: 'lock_screen' })
    addToast({ title: 'MOBILE', message: res?.ok ? 'Lock command sent.' : 'Phone not connected.', type: res?.ok ? 'info' : 'warning' })
  }

  async function copyServerAddr() {
    if (serverInfo) {
      await navigator.clipboard.writeText(`${serverInfo.ip}:${serverInfo.port}`)
      addToast({ title: 'MOBILE', message: 'Server address copied.', type: 'info' })
    }
  }

  return (
    <WidgetCard id="mobile" title="MOBILE HUB" icon={Smartphone}>
      <div className="space-y-3">

        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div className={`status-dot ${mobile.connected ? 'online' : 'offline'}`} />
          <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron', letterSpacing: '0.08em', color: mobile.connected ? '#00ff88' : '#ff4444' }}>
            {mobile.connected ? 'CONNECTED' : 'WAITING FOR PHONE'}
          </span>
          <button onClick={poll} style={{ marginLeft: 'auto', color: 'rgba(200,238,255,0.3)' }}>
            <RefreshCw size={11} />
          </button>
        </div>

        {/* Server address row */}
        {serverInfo && (
          <div className="flex items-center gap-2" style={{ background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.12)', borderRadius: 4, padding: '4px 8px' }}>
            <Wifi size={10} style={{ color: '#00c8ff', flexShrink: 0 }} />
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.62rem', color: '#c8eeff', flex: 1 }}>
              {serverInfo.ip}:{serverInfo.port}
            </span>
            <button onClick={copyServerAddr} style={{ color: 'rgba(200,238,255,0.4)' }}>
              <Copy size={10} />
            </button>
          </div>
        )}

        {/* QR Code panel */}
        <div>
          <button
            className="hud-btn w-full flex items-center gap-2 justify-center"
            onClick={() => setShowQR(v => !v)}
          >
            <QrCode size={11} />
            {showQR ? 'HIDE PAIRING QR' : 'SHOW PAIRING QR'}
          </button>
          {showQR && qrDataUrl && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <img src={qrDataUrl} alt="Pairing QR" style={{ width: 140, height: 140, imageRendering: 'pixelated', borderRadius: 4, border: '1px solid rgba(0,200,255,0.2)' }} />
              <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', textAlign: 'center' }}>
                Scan with the JACPOTE mobile app
              </span>
            </div>
          )}
        </div>

        {/* Live phone info (when connected) */}
        {mobile.connected && (
          <>
            {mobile.deviceName && (
              <div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', marginBottom: 2 }}>DEVICE</div>
                <div style={{ fontSize: '0.7rem', color: '#c8eeff', fontFamily: 'Share Tech Mono' }}>{mobile.deviceName}</div>
              </div>
            )}

            {mobile.battery != null && (
              <div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', marginBottom: 4 }}>PHONE BATTERY</div>
                <BatteryBar level={mobile.battery} />
              </div>
            )}

            {phoneStatus?.signal != null && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>SIGNAL</span>
                <span style={{ fontSize: '0.65rem', fontFamily: 'Share Tech Mono', color: '#00c8ff' }}>{phoneStatus.signal}%</span>
              </div>
            )}

            {/* Quick actions */}
            <div>
              <div className="hud-label-sm mb-2" style={{ fontSize: '0.55rem' }}>QUICK ACTIONS</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button className="hud-btn flex items-center gap-1.5 justify-center" onClick={handleRing}>
                  <Bell size={10} /> RING
                </button>
                <button className="hud-btn flex items-center gap-1.5 justify-center" onClick={handleLock}>
                  <CheckCircle size={10} /> LOCK
                </button>
              </div>
            </div>
          </>
        )}

        {!mobile.connected && (
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', textAlign: 'center', paddingTop: 4 }}>
            Open the JACPOTE app on your phone,<br />scan the QR code above to connect.
          </div>
        )}
      </div>
    </WidgetCard>
  )
}


function BatteryBar({ level }) {
  const color = level > 50 ? '#00ff88' : level > 20 ? '#ffd700' : '#ff4444'
  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          width: 28, height: 14,
          border: `1.5px solid ${color}`,
          borderRadius: 3,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
        }}
      >
        {/* Battery tip */}
        <div
          style={{
            position: 'absolute',
            right: -4, top: 3, bottom: 3,
            width: 3, background: color, borderRadius: '0 2px 2px 0',
          }}
        />
        <div
          style={{
            height: '100%',
            width: `${level}%`,
            background: color,
            borderRadius: 1,
            transition: 'width 0.5s ease',
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      </div>
      <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.7rem', color }}>{level}%</span>
    </div>
  )
}

function SignalBars({ strength = 3, max = 5 }) {
  return (
    <div className="flex items-end gap-0.5" style={{ height: 16 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${((i + 1) / max) * 100}%`,
            background: i < strength ? '#00c8ff' : 'rgba(0,200,255,0.15)',
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  )
}

export default function MobileHub() {
  const mobile = useAppStore((s) => s.mobile)
  const setMobile = useAppStore((s) => s.setMobile)
  const addToast = useAppStore((s) => s.addToast)
  const [devices, setDevices] = useState([])

  const poll = useCallback(async () => {
    const status = await window.api?.mobile.getStatus(mobile.deviceId)
    if (status) {
      setMobile(status)
    }
  }, [mobile.deviceId])

  useEffect(() => {
    poll()
    const iv = setInterval(poll, 5000)
    // List devices
    window.api?.mobile.listDevices().then((devs) => setDevices(devs || []))
    return () => clearInterval(iv)
  }, [])

  async function handleAction(action) {
    const id = mobile.deviceId
    if (!id) { addToast({ title: 'MOBILE', message: 'No device connected.', type: 'warning' }); return }
    switch (action) {
      case 'ring':
        await window.api?.mobile.ring(id)
        addToast({ title: 'MOBILE', message: 'Ring signal sent.', type: 'info' })
        break
      default: break
    }
  }

  return (
    <WidgetCard id="mobile" title="MOBILE HUB" icon={Smartphone}>
      <div className="space-y-3">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div className={`status-dot ${mobile.connected ? 'online' : 'offline'}`} />
          <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron', letterSpacing: '0.08em', color: mobile.connected ? '#00ff88' : '#ff4444' }}>
            {mobile.connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
          <button
            onClick={poll}
            style={{ marginLeft: 'auto', color: 'rgba(200,238,255,0.3)' }}
            className="hover:text-white transition-colors"
          >
            <RefreshCw size={11} />
          </button>
        </div>

        {!mobile.connected ? (
          <div className="flex flex-col items-center gap-3 py-3">
            <AlertTriangle size={24} style={{ color: '#ff4444' }} />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', textAlign: 'center' }}>
              KDE Connect device offline.<br />Ensure the app is running and on the same network.
            </div>
            <button className="hud-btn" onClick={poll}>RETRY CONNECTION</button>
          </div>
        ) : (
          <>
            {/* Device info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', marginBottom: 2 }}>DEVICE</div>
                <div style={{ fontSize: '0.7rem', color: '#c8eeff', fontFamily: 'Share Tech Mono' }}>
                  {mobile.deviceName || mobile.deviceId?.slice(0, 10) || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', marginBottom: 2 }}>CONNECTION</div>
                <div className="flex items-center gap-1">
                  <Wifi size={10} style={{ color: '#00c8ff' }} />
                  <span style={{ fontSize: '0.7rem', color: '#c8eeff', fontFamily: 'Share Tech Mono' }}>WiFi</span>
                </div>
              </div>
            </div>

            {/* Battery */}
            {mobile.battery != null && (
              <div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', marginBottom: 4 }}>BATTERY</div>
                <BatteryBar level={mobile.battery} />
              </div>
            )}

            {/* Signal */}
            <div className="flex items-center gap-2">
              <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>SIGNAL</div>
              <SignalBars strength={4} />
            </div>

            {/* Quick actions */}
            <div>
              <div className="hud-label-sm mb-2" style={{ fontSize: '0.55rem' }}>QUICK ACTIONS</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button className="hud-btn flex items-center gap-1.5 justify-center" onClick={() => handleAction('ring')}>
                  <Bell size={10} /> RING
                </button>
                <button className="hud-btn flex items-center gap-1.5 justify-center" onClick={() => addToast({ title: 'MOBILE', message: 'Ping sent.', type: 'info' })}>
                  <Signal size={10} /> PING
                </button>
                <button className="hud-btn flex items-center gap-1.5 justify-center" onClick={() => addToast({ title: 'MOBILE', message: 'Lock screen command sent.', type: 'info' })}>
                  <Lock size={10} /> LOCK
                </button>
                <button className="hud-btn flex items-center gap-1.5 justify-center" onClick={() => addToast({ title: 'MOBILE', message: 'Screenshot requested.', type: 'info' })}>
                  <Camera size={10} /> SHOT
                </button>
              </div>
            </div>

            {/* Device list */}
            {devices.length > 1 && (
              <div>
                <div className="hud-label-sm mb-1" style={{ fontSize: '0.55rem' }}>OTHER DEVICES</div>
                <div className="space-y-0.5">
                  {devices.map((d, i) => (
                    <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
                      {d.raw}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetCard>
  )
}
