import React, { useEffect, useState } from 'react'
import { Music, Smartphone, Wifi, Camera, StickyNote, Clipboard, ArrowUp, ArrowDown } from 'lucide-react'
import CircleWidget, { CLabel, CValue, CDivider } from './CircleWidget'
import { useAppStore } from '../store/appStore'

/** Spotify mini circle — album art + play status */
function SpotifyCircle({ spotify }) {
  const isPlaying = spotify?.isPlaying
  const track = spotify?.trackName
  const artist = spotify?.artistName
  const art = spotify?.albumArt

  return (
    <CircleWidget size={150} color={isPlaying ? '#1db954' : 'rgba(0,200,255,0.4)'}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {art ? (
          <img
            src={art}
            alt=""
            style={{
              width: 64, height: 64,
              borderRadius: '50%',
              border: `2px solid ${isPlaying ? '#1db954' : 'rgba(0,200,255,0.3)'}`,
              boxShadow: isPlaying ? '0 0 14px rgba(29,185,84,0.4)' : '0 0 8px rgba(0,200,255,0.2)',
              animation: isPlaying ? 'spin 8s linear infinite' : 'none',
            }}
          />
        ) : (
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '1px solid rgba(0,200,255,0.3)',
            background: 'rgba(0,200,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Music size={20} style={{ color: '#00c8ff' }} />
          </div>
        )}
        <div style={{ maxWidth: '85%', overflow: 'hidden', textAlign: 'center' }}>
          {track ? (
            <>
              <div style={{ fontFamily: 'Rajdhani', fontSize: '0.68rem', color: '#c8eeff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track.slice(0, 14)}
              </div>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color: 'rgba(200,238,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {artist?.slice(0, 14)}
              </div>
            </>
          ) : (
            <CLabel color="rgba(0,200,255,0.4)">NO TRACK</CLabel>
          )}
        </div>
      </div>
    </CircleWidget>
  )
}

/** Mobile battery circle */
function MobileCircle({ mobile }) {
  const batt = mobile?.battery ?? 0
  const connected = mobile?.connected
  const battColor = batt > 50 ? '#00ff88' : batt > 20 ? '#ffd700' : '#ff4444'

  return (
    <CircleWidget size={150} color={connected ? battColor : 'rgba(200,238,255,0.15)'}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Smartphone size={14} style={{ color: connected ? battColor : 'rgba(200,238,255,0.25)', marginBottom: 2 }} />
        <CValue color={connected ? battColor : 'rgba(200,238,255,0.3)'} size={connected ? '1.6rem' : '0.75rem'}>
          {connected ? `${batt}%` : 'OFFLINE'}
        </CValue>
        {connected && (
          <>
            <CDivider color={`${battColor}33`} />
            <CLabel color={battColor}>BATTERY</CLabel>
            {mobile?.signal != null && (
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.58rem', color: 'rgba(200,238,255,0.4)' }}>
                SIG {mobile.signal}%
              </span>
            )}
          </>
        )}
        {!connected && <CLabel color="rgba(200,238,255,0.25)">MOBILE</CLabel>}
      </div>
    </CircleWidget>
  )
}

/** Network up/down speeds circle */
function NetworkCircle({ network }) {
  const up = network?.up ?? 0
  const down = network?.down ?? 0
  const fmt = (v) => v >= 1024 ? `${(v/1024).toFixed(1)}M` : `${v?.toFixed(0)}K`

  return (
    <CircleWidget size={150} color="#ff6b2b">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <Wifi size={14} style={{ color: '#ff6b2b', opacity: 0.7 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ArrowUp size={10} style={{ color: '#ff6b2b', opacity: 0.6 }} />
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.75rem', color: '#ff6b2b' }}>{fmt(up)}</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.38rem', color: 'rgba(255,107,43,0.5)' }}>B/s</span>
          </div>
          <div style={{ width: 1, height: 28, background: 'rgba(255,107,43,0.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ArrowDown size={10} style={{ color: '#00c8ff', opacity: 0.6 }} />
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.75rem', color: '#00c8ff' }}>{fmt(down)}</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.38rem', color: 'rgba(0,200,255,0.5)' }}>B/s</span>
          </div>
        </div>
        <CDivider color="rgba(255,107,43,0.2)" />
        <CLabel color="#ff6b2b">NETWORK</CLabel>
      </div>
    </CircleWidget>
  )
}

/** Notes count circle */
function NotesCircle({ onClick }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    window.api?.notes?.getAll?.()?.then?.(notes => setCount(notes?.filter(n => !n.archived)?.length ?? 0))
  }, [])
  return (
    <CircleWidget size={150} color="#ffd700" onClick={onClick}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <StickyNote size={16} style={{ color: '#ffd700', opacity: 0.7 }} />
        <CValue color="#ffd700" size="1.8rem">{count}</CValue>
        <CDivider color="rgba(255,215,0,0.2)" />
        <CLabel color="#ffd700">NOTES</CLabel>
      </div>
    </CircleWidget>
  )
}

/** Clipboard count circle */
function ClipboardCircle({ onClick }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    window.api?.clipboard?.getAll?.()?.then?.(items => setCount(items?.length ?? 0))
  }, [])
  return (
    <CircleWidget size={150} color="rgba(0,200,255,0.6)" onClick={onClick}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <Clipboard size={16} style={{ color: '#00c8ff', opacity: 0.7 }} />
        <CValue color="#00c8ff" size="1.8rem">{count}</CValue>
        <CDivider />
        <CLabel>CLIPBOARD</CLabel>
      </div>
    </CircleWidget>
  )
}

export default function HUDRightPanel() {
  const spotify = useAppStore((s) => s.spotify)
  const mobile = useAppStore((s) => s.mobile)
  const network = useAppStore((s) => s.network)
  const setActiveView = useAppStore((s) => s.setActiveView)

  return (
    <div className="hud-side-col" style={{ alignItems: 'center' }}>
      <SpotifyCircle spotify={spotify} />
      <MobileCircle mobile={mobile} />
      <NetworkCircle network={network} />
      <NotesCircle onClick={() => setActiveView('notes')} />
      <ClipboardCircle onClick={() => setActiveView('clipboard')} />
    </div>
  )
}
