import React, { useEffect, useState, useCallback } from 'react'
import { Smartphone, Battery, Signal, HardDrive, Bell, RefreshCw, Lock, Camera, Wifi, AlertTriangle } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

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
