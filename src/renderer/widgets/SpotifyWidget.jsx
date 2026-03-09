import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Repeat1,
  Volume2, Heart, Monitor, Music, RefreshCw, ChevronDown
} from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'
import {
  startSpotifyAuth, exchangeCode, refreshToken,
  getPlaybackState, getRecentlyPlayed, getQueue, getDevices,
  pausePlayback, resumePlayback, skipNext, skipPrev,
  setShuffle, setRepeat, seekTo, setVolume, saveTrack, removeTrack, checkSaved,
  formatMs
} from '../services/spotify'

function VinylRecord({ albumArt, isPlaying, size = 100 }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size, borderRadius: '50%' }}
    >
      {/* Album art blur background */}
      {albumArt && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage: `url(${albumArt})`,
            backgroundSize: 'cover',
            filter: 'blur(6px) brightness(0.3)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      {/* Vinyl disc */}
      <div
        className={`absolute inset-0 rounded-full vinyl-spin ${!isPlaying ? 'paused' : ''}`}
        style={{
          background: `conic-gradient(
            #111 0deg, #1a1a1a 10deg, #111 20deg, #1a1a1a 30deg,
            #111 40deg, #1a1a1a 50deg, #111 60deg, #1a1a1a 70deg,
            #111 80deg, #1a1a1a 90deg, #111 100deg, #1a1a1a 110deg,
            #111 120deg, #1a1a1a 130deg, #111 140deg, #1a1a1a 150deg,
            #111 160deg, #1a1a1a 170deg, #111 180deg, #1a1a1a 190deg,
            #111 200deg, #1a1a1a 210deg, #111 220deg, #1a1a1a 230deg,
            #111 240deg, #1a1a1a 250deg, #111 260deg, #1a1a1a 270deg,
            #111 280deg, #1a1a1a 290deg, #111 300deg, #1a1a1a 310deg,
            #111 320deg, #1a1a1a 330deg, #111 340deg, #1a1a1a 350deg, #111 360deg
          )`,
          border: '2px solid rgba(0,200,255,0.12)',
          boxShadow: '0 0 10px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.7)',
        }}
      >
        {/* Album art overlay (inner circle) */}
        {albumArt && (
          <div
            className="absolute rounded-full"
            style={{
              inset: '20%',
              backgroundImage: `url(${albumArt})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        {/* Center dot */}
        <div
          className="absolute rounded-full"
          style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${size * 0.08}px`, height: `${size * 0.08}px`,
            background: '#00c8ff',
            boxShadow: '0 0 8px #00c8ff',
            zIndex: 10,
          }}
        />
      </div>
    </div>
  )
}

export default function SpotifyWidget() {
  const spotify = useAppStore((s) => s.spotify)
  const setSpotify = useAppStore((s) => s.setSpotify)
  const addToast = useAppStore((s) => s.addToast)

  const [clientId, setClientId] = useState('')
  const [savedTrack, setSavedTrack] = useState(false)
  const [showDevices, setShowDevices] = useState(false)
  const pollRef = useRef(null)
  const tokenRef = useRef(null)
  const refreshRef = useRef(null)

  // Load saved token on mount
  useEffect(() => {
    window.api?.store.get('spotify.token').then((tok) => {
      if (tok) { tokenRef.current = tok; setSpotify({ authenticated: true, token: tok }); startPolling(tok) }
    })
    window.api?.store.get('spotify.clientId').then((id) => { if (id) setClientId(id) })
    window.api?.store.get('spotify.refreshToken').then((rt) => { refreshRef.current = rt })

    // Listen for OAuth callback
    const cleanup = window.api?.spotify.onCallback(async ({ code, state }) => {
      const savedState = sessionStorage.getItem('spotify_state')
      if (state !== savedState) return
      const cid = clientId || (await window.api?.store.get('spotify.clientId'))
      const data = await exchangeCode(code, cid)
      if (data.access_token) {
        tokenRef.current = data.access_token
        refreshRef.current = data.refresh_token
        await window.api?.store.set('spotify.token', data.access_token)
        await window.api?.store.set('spotify.refreshToken', data.refresh_token)
        setSpotify({ authenticated: true, token: data.access_token })
        startPolling(data.access_token)
        addToast({ title: 'SPOTIFY', message: 'Authentication successful!', type: 'success' })
      }
    })
    return () => { cleanup?.(); clearInterval(pollRef.current) }
  }, [])

  const doRefresh = useCallback(async () => {
    const cid = clientId || await window.api?.store.get('spotify.clientId')
    const rt = refreshRef.current || await window.api?.store.get('spotify.refreshToken')
    if (!rt || !cid) return null
    const data = await refreshToken(rt, cid)
    if (data.access_token) {
      tokenRef.current = data.access_token
      await window.api?.store.set('spotify.token', data.access_token)
      setSpotify({ token: data.access_token })
      return data.access_token
    }
    return null
  }, [clientId])

  const fetchState = useCallback(async (token) => {
    let tok = token || tokenRef.current
    if (!tok) return
    let state = await getPlaybackState(tok)
    if (!state && refreshRef.current) {
      tok = await doRefresh()
      if (tok) state = await getPlaybackState(tok)
    }
    if (!state) return

    const tr = state.item
    setSpotify({
      playing: state.is_playing,
      track: tr?.name,
      artist: tr?.artists?.map(a => a.name).join(', '),
      album: tr?.album?.name,
      albumArt: tr?.album?.images?.[0]?.url,
      progress: state.progress_ms,
      duration: tr?.duration_ms,
      volume: state.device?.volume_percent,
      shuffle: state.shuffle_state,
      repeat: state.repeat_state,
    })

    // Check if current track is saved
    if (tr?.id) checkSaved(tok, tr.id).then(setSavedTrack)
  }, [doRefresh])

  function startPolling(token) {
    clearInterval(pollRef.current)
    fetchState(token)
    pollRef.current = setInterval(() => fetchState(), 1000)
    // Fetch supplemental data less frequently
    fetchSupplemental(token)
    const suppTimer = setInterval(() => fetchSupplemental(), 10000)
    return () => clearInterval(suppTimer)
  }

  async function fetchSupplemental(token) {
    const tok = token || tokenRef.current
    if (!tok) return
    const [recent, queue, devs] = await Promise.all([
      getRecentlyPlayed(tok),
      getQueue(tok),
      getDevices(tok),
    ])
    setSpotify({
      recentlyPlayed: recent?.items?.map(i => i.track) ?? [],
      queue: queue?.queue?.slice(0, 3) ?? [],
      devices: devs?.devices ?? [],
    })
  }

  const withToken = (fn) => () => fn(tokenRef.current)

  async function handleAuth() {
    const cid = clientId || await window.api?.store.get('spotify.clientId')
    if (!cid) { addToast({ title: 'SPOTIFY', message: 'Set your Spotify Client ID in Settings first.', type: 'warning' }); return }
    startSpotifyAuth(cid)
  }

  const seekBarRef = useRef(null)
  function handleSeek(e) {
    const rect = seekBarRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = (e.clientX - rect.left) / rect.width
    const ms = pct * (spotify.duration || 0)
    seekTo(tokenRef.current, ms)
    setSpotify({ progress: ms })
  }

  if (!spotify.authenticated) {
    return (
      <WidgetCard id="spotify" title="SPOTIFY PLAYER" icon={Music}>
        <div className="flex flex-col items-center gap-4 py-4">
          <Music size={32} style={{ color: 'rgba(0,200,255,0.2)' }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', textAlign: 'center' }}>
            Connect your Spotify account to control playback.
          </div>
          <button className="hud-btn" onClick={handleAuth}>AUTHENTICATE SPOTIFY</button>
        </div>
      </WidgetCard>
    )
  }

  const pct = spotify.duration ? (spotify.progress / spotify.duration) * 100 : 0

  return (
    <WidgetCard id="spotify" title="SPOTIFY PLAYER" icon={Music}>
      <div className="space-y-3">
        {/* ── Now Playing ── */}
        {spotify.track ? (
          <>
            {/* Album art + info row */}
            <div className="flex items-center gap-3">
              {/* Blurred background wash */}
              <div className="relative">
                {spotify.albumArt && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      width: 72, height: 72,
                      backgroundImage: `url(${spotify.albumArt})`,
                      backgroundSize: 'cover',
                      filter: 'blur(20px) brightness(0.4)',
                      transform: 'scale(1.5)',
                      borderRadius: '50%',
                    }}
                  />
                )}
                <VinylRecord albumArt={spotify.albumArt} isPlaying={spotify.playing} size={72} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-semibold truncate"
                  style={{ fontSize: '0.85rem', color: '#c8eeff', fontFamily: 'Rajdhani', fontWeight: 600 }}
                >
                  {spotify.track}
                </div>
                <div className="truncate" style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
                  {spotify.artist}
                </div>
                <div className="truncate" style={{ fontSize: '0.62rem', color: 'rgba(200,238,255,0.3)', fontFamily: 'Rajdhani' }}>
                  {spotify.album}
                </div>
              </div>
              {/* Heart */}
              <button
                onClick={() => savedTrack
                  ? removeTrack(tokenRef.current, null).then(() => setSavedTrack(false))
                  : saveTrack(tokenRef.current, null).then(() => setSavedTrack(true))
                }
                style={{ color: savedTrack ? '#ff4444' : 'rgba(200,238,255,0.3)', flexShrink: 0 }}
              >
                <Heart size={14} fill={savedTrack ? '#ff4444' : 'none'} />
              </button>
            </div>

            {/* Seek bar */}
            <div>
              <div
                ref={seekBarRef}
                className="progress-bar-track cursor-pointer"
                onClick={handleSeek}
              >
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                  {formatMs(spotify.progress)}
                </span>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.58rem', color: 'var(--text-dim)' }}>
                  {formatMs(spotify.duration)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-4">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono' }}>
              NOTHING PLAYING
            </span>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="flex items-center justify-between">
          {/* Shuffle */}
          <button
            onClick={() => setShuffle(tokenRef.current, !spotify.shuffle)}
            className={spotify.shuffle ? 'hud-btn active' : ''}
            style={{ color: spotify.shuffle ? '#00c8ff' : 'rgba(200,238,255,0.35)', padding: 4 }}
          >
            <Shuffle size={13} />
          </button>

          {/* Prev */}
          <button
            onClick={() => skipPrev(tokenRef.current).then(() => fetchState())}
            style={{ color: 'rgba(200,238,255,0.6)', padding: 4 }}
            className="hover:text-white transition-colors"
          >
            <SkipBack size={16} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => {
              const fn = spotify.playing ? pausePlayback : resumePlayback
              fn(tokenRef.current).then(() => fetchState())
            }}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36, height: 36,
              background: 'rgba(0,200,255,0.15)',
              border: '1px solid rgba(0,200,255,0.4)',
              color: '#00c8ff',
              boxShadow: '0 0 12px rgba(0,200,255,0.3)',
            }}
          >
            {spotify.playing ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Next */}
          <button
            onClick={() => skipNext(tokenRef.current).then(() => fetchState())}
            style={{ color: 'rgba(200,238,255,0.6)', padding: 4 }}
            className="hover:text-white transition-colors"
          >
            <SkipForward size={16} />
          </button>

          {/* Repeat */}
          <button
            onClick={() => {
              const next = spotify.repeat === 'off' ? 'context' : spotify.repeat === 'context' ? 'track' : 'off'
              setRepeat(tokenRef.current, next)
            }}
            style={{
              color: spotify.repeat !== 'off' ? '#00c8ff' : 'rgba(200,238,255,0.35)',
              boxShadow: spotify.repeat !== 'off' ? '0 0 8px rgba(0,200,255,0.4)' : 'none',
              padding: 4,
            }}
          >
            {spotify.repeat === 'track' ? <Repeat1 size={13} /> : <Repeat size={13} />}
          </button>
        </div>

        {/* ── Volume ── */}
        <div className="flex items-center gap-2">
          <Volume2 size={11} style={{ color: 'rgba(200,238,255,0.4)', flexShrink: 0 }} />
          <input
            type="range"
            min="0" max="100"
            value={spotify.volume || 0}
            onChange={(e) => {
              setSpotify({ volume: +e.target.value })
              setVolume(tokenRef.current, +e.target.value)
            }}
            className="flex-1"
            style={{ accentColor: '#00c8ff', height: '3px' }}
          />
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.58rem', color: 'var(--text-dim)', minWidth: '24px' }}>
            {spotify.volume}%
          </span>
        </div>

        {/* ── Queue preview ── */}
        {spotify.queue?.length > 0 && (
          <div>
            <div className="hud-label-sm mb-1.5" style={{ fontSize: '0.55rem' }}>UP NEXT</div>
            {spotify.queue.map((t, i) => (
              <div key={i} className="flex items-center gap-2 py-1" style={{ borderTop: i === 0 ? '1px solid rgba(0,200,255,0.06)' : 'none' }}>
                <div
                  style={{
                    width: 24, height: 24, flexShrink: 0,
                    backgroundImage: t.album?.images?.[0]?.url ? `url(${t.album.images[0].url})` : 'none',
                    backgroundSize: 'cover',
                    background: t.album?.images?.[0]?.url ? undefined : 'rgba(0,200,255,0.08)',
                    borderRadius: 2,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: '0.7rem', color: '#c8eeff', fontFamily: 'Rajdhani' }}>{t.name}</div>
                  <div className="truncate" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
                    {t.artists?.map(a => a.name).join(', ')}
                  </div>
                </div>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.58rem', color: 'rgba(200,238,255,0.25)' }}>
                  {formatMs(t.duration_ms)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Recently played ── */}
        {spotify.recentlyPlayed?.length > 0 && (
          <div>
            <div className="hud-label-sm mb-1.5" style={{ fontSize: '0.55rem' }}>RECENTLY PLAYED</div>
            <div className="space-y-0.5 max-h-28 overflow-y-auto">
              {spotify.recentlyPlayed.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <div
                    style={{
                      width: 20, height: 20, flexShrink: 0,
                      backgroundImage: t?.album?.images?.[1]?.url ? `url(${t.album.images[1].url})` : 'none',
                      backgroundSize: 'cover',
                      background: t?.album?.images?.[1]?.url ? undefined : 'rgba(0,200,255,0.05)',
                      borderRadius: 2,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
                      {t?.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Device switcher ── */}
        {spotify.devices?.length > 0 && (
          <div>
            <button
              className="flex items-center gap-2 w-full"
              onClick={() => setShowDevices(d => !d)}
              style={{ color: 'var(--text-dim)' }}
            >
              <Monitor size={11} />
              <span style={{ fontSize: '0.6rem', fontFamily: 'Rajdhani' }}>
                {spotify.devices.find(d => d.is_active)?.name || 'No active device'}
              </span>
              <ChevronDown size={10} style={{ marginLeft: 'auto', transform: showDevices ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showDevices && (
              <div className="mt-1 space-y-0.5">
                {spotify.devices.map((d) => (
                  <button
                    key={d.id}
                    className="flex items-center gap-2 w-full px-2 py-1 rounded transition-colors hover:bg-white/5"
                    onClick={() => {
                      spotifyFetch?.(`/me/player`, tokenRef.current, {
                        method: 'PUT',
                        body: JSON.stringify({ device_ids: [d.id] }),
                      })
                      setShowDevices(false)
                    }}
                  >
                    <div className={`status-dot ${d.is_active ? 'online' : ''}`} style={{ width: 5, height: 5 }} />
                    <span style={{ fontSize: '0.68rem', color: d.is_active ? '#00c8ff' : 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
                      {d.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
