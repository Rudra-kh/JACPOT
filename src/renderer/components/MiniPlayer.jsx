import React, { useEffect, useRef, useState } from 'react'

// ─── CSS Animations (injected once) ─────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes mpEq1 { from { height: 4px; } to { height: 18px; } }
  @keyframes mpEq2 { from { height: 6px; } to { height: 14px; } }
  @keyframes mpEq3 { from { height: 3px; } to { height: 20px; } }
  @keyframes mpEq4 { from { height: 8px; } to { height: 16px; } }
  @keyframes mpEq5 { from { height: 5px; } to { height: 12px; } }
  @keyframes mpEqX1 { from { height: 3px; } to { height: 14px; } }
  @keyframes mpEqX2 { from { height: 5px; } to { height: 10px; } }
  @keyframes mpEqX3 { from { height: 2px; } to { height: 13px; } }
  @keyframes mpEqX4 { from { height: 6px; } to { height: 11px; } }
  @keyframes mpEqX5 { from { height: 4px; } to { height: 8px; } }
  @keyframes mpEqZ1 { from { height: 6px; } to { height: 26px; } }
  @keyframes mpEqZ2 { from { height: 8px; } to { height: 20px; } }
  @keyframes mpEqZ3 { from { height: 5px; } to { height: 28px; } }
  @keyframes mpEqZ4 { from { height: 10px; } to { height: 22px; } }
  @keyframes mpEqZ5 { from { height: 7px; } to { height: 18px; } }
  @keyframes mpScanLine { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
  @keyframes mpMarquee { 0%,15% { transform: translateX(0); } 85%,100% { transform: translateX(-60%); } }
  @keyframes mpSlideOutLeft { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-32px); opacity: 0; } }
  @keyframes mpSlideInRight { from { transform: translateX(32px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes mpFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes mpPulseBorder {
    0%   { box-shadow: 0 0 8px var(--mp-accent); }
    50%  { box-shadow: 0 0 32px var(--mp-accent), 0 0 60px var(--mp-accent-dim); }
    100% { box-shadow: 0 0 8px var(--mp-accent); }
  }
`

// ─── Sub-components ──────────────────────────────────────────────────────

function EQVisualizer({ isPlaying, size = 'standard' }) {
  const cfgs = {
    nano:     { prefix: 'X', barW: 2, gap: 1, heights: [3,5,2,6,4] },
    standard: { prefix: '',  barW: 3, gap: 2, heights: [4,6,3,8,5] },
    expanded: { prefix: 'Z', barW: 6, gap: 3, heights: [6,8,5,10,7] },
  }
  const c = cfgs[size] || cfgs.standard
  const delays = ['0s','0.1s','0.25s','0.15s','0.05s']
  const durs   = ['0.8s','0.5s','0.7s','0.6s','0.9s']

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: c.gap, flexShrink: 0 }}>
      {c.heights.map((lo, i) => (
        <div key={i} style={{
          width: c.barW,
          height: lo,
          background: 'var(--mp-accent)',
          boxShadow: isPlaying ? '0 0 4px var(--mp-accent)' : 'none',
          borderRadius: 1,
          minHeight: lo,
          animation: isPlaying ? `mpEq${c.prefix}${i+1} ${durs[i]} ease-in-out infinite alternate ${delays[i]}` : 'none',
          transition: isPlaying ? 'none' : 'height 0.6s ease',
        }} />
      ))}
    </div>
  )
}

function SeekBar({ progressMs, durationMs, onSeek }) {
  const [hovering, setHovering] = useState(false)
  const barRef = useRef(null)
  const pct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0

  function handleClick(e) {
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    onSeek(Math.round(((e.clientX - rect.left) / rect.width) * durationMs))
  }

  function fmt(ms) {
    const s = Math.floor((ms || 0) / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div style={{ width: '100%' }}>
      <div
        ref={barRef}
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          width: '100%', height: hovering ? 6 : 4, position: 'relative',
          cursor: 'pointer', background: 'rgba(255,255,255,0.1)',
          borderRadius: 3, transition: 'height 0.1s', WebkitAppRegion: 'no-drag',
        }}
      >
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: 'var(--mp-accent)',
          boxShadow: '0 0 6px var(--mp-accent)',
          transition: 'width 0.5s linear',
        }} />
        {hovering && (
          <div style={{
            position: 'absolute', top: '50%', left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--mp-accent)', boxShadow: '0 0 8px var(--mp-accent)',
            transition: 'left 0.5s linear',
          }} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(200,238,255,0.4)' }}>{fmt(progressMs)}</span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(200,238,255,0.4)' }}>{fmt(durationMs)}</span>
      </div>
    </div>
  )
}

function Btn({ onClick, title, size = 16, active = false, children, style: extraStyle = {} }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: size + 10, height: size + 10, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', cursor: 'pointer',
        color: active ? 'var(--mp-accent)' : 'rgba(200,238,255,0.65)',
        fontSize: size, lineHeight: 1, WebkitAppRegion: 'no-drag',
        borderRadius: 3, transition: 'color 0.15s',
        textShadow: active ? '0 0 8px var(--mp-accent)' : 'none',
        flexShrink: 0,
        ...extraStyle,
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--mp-accent)'}
      onMouseLeave={e => e.currentTarget.style.color = active ? 'var(--mp-accent)' : 'rgba(200,238,255,0.65)'}
    >
      {children}
    </button>
  )
}

function AlbumArt({ url, size, letter = '?' }) {
  const [err, setErr] = useState(false)
  const resetErr = () => setErr(false)

  useEffect(() => { setErr(false) }, [url])

  if (!url || err) {
    return (
      <div style={{
        width: size, height: size, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle, var(--mp-accent)22 0%, #020c18 100%)',
        border: '2px solid var(--mp-accent)',
        boxShadow: '0 0 16px var(--mp-accent)66',
        fontFamily: 'Orbitron', fontSize: Math.round(size * 0.38),
        color: 'var(--mp-accent)',
      }}>
        {letter}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt="art"
      onError={() => setErr(true)}
      style={{
        width: size, height: size, objectFit: 'cover', flexShrink: 0,
        border: '2px solid var(--mp-accent)',
        boxShadow: '0 0 16px var(--mp-accent)66',
        display: 'block',
      }}
    />
  )
}

function MarqueeText({ text, maxWidth, style: s = {} }) {
  const ref = useRef(null)
  const [scrolling, setScrolling] = useState(false)

  useEffect(() => {
    if (ref.current) setScrolling(ref.current.scrollWidth > maxWidth + 4)
  }, [text, maxWidth])

  return (
    <div style={{ overflow: 'hidden', maxWidth, ...s }}>
      <div ref={ref} style={{
        whiteSpace: 'nowrap', display: 'inline-block',
        animation: scrolling ? 'mpMarquee 14s linear infinite' : 'none',
        paddingRight: scrolling ? 30 : 0,
      }}>
        {text}
      </div>
    </div>
  )
}

// ─── Playback Controls Row ────────────────────────────────────────────────
function Controls({ state, cmd, compact = false }) {
  const [showVol, setShowVol] = useState(false)
  const sz = compact ? 13 : 16

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 2 : 4, WebkitAppRegion: 'no-drag' }}>
      <Btn onClick={() => cmd('toggleShuffle')} size={compact ? 11 : 12} active={state?.isShuffle} title="Shuffle">⇄</Btn>
      <Btn onClick={() => cmd('previous')} size={sz} title="Previous">⏮</Btn>
      <Btn
        onClick={() => cmd(state?.isPlaying ? 'pause' : 'play')}
        size={compact ? 18 : 22}
        style={{ color: 'var(--mp-accent)', textShadow: '0 0 10px var(--mp-accent)' }}
      >
        {state?.isPlaying ? '⏸' : '▶'}
      </Btn>
      <Btn onClick={() => cmd('next')} size={sz} title="Next">⏭</Btn>
      <Btn
        onClick={() => cmd('toggleRepeat')}
        size={compact ? 11 : 12}
        active={state?.repeatMode !== 'off'}
        title={state?.repeatMode === 'track' ? 'Repeat One' : 'Repeat'}
      >
        {state?.repeatMode === 'track' ? '↺' : '⇁'}
      </Btn>

      {/* Volume */}
      <div style={{ marginLeft: 'auto', position: 'relative', WebkitAppRegion: 'no-drag' }}>
        <Btn onClick={() => setShowVol(v => !v)} size={11} title="Volume">🔊</Btn>
        {showVol && (
          <div style={{
            position: 'absolute', bottom: '130%', right: 0,
            background: 'rgba(2,12,24,0.97)', border: '1px solid var(--mp-accent)44',
            borderRadius: 4, padding: '8px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            zIndex: 100,
          }}>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: 'var(--mp-accent)' }}>{state?.volume ?? 50}%</span>
            <input
              type="range" min={0} max={100}
              value={state?.volume ?? 50}
              onChange={e => cmd('setVolume', { volumePercent: +e.target.value })}
              style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 60, width: 18, accentColor: 'var(--mp-accent)' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Nano Mode (280×50) ─────────────────────────────────────────────────
function NanoMode({ state, cmd, switchMode }) {
  const pct = state?.durationMs > 0 ? (state.progressMs / state.durationMs) * 100 : 0
  const isPlaying = state?.isPlaying

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(2,12,24,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--mp-accent)99',
      boxShadow: '0 4px 8px var(--mp-accent)33',
      display: 'flex', alignItems: 'center',
      padding: '0 6px', gap: 5,
      position: 'relative', overflow: 'hidden',
      WebkitAppRegion: 'drag',
    }}>
      <div style={{ WebkitAppRegion: 'no-drag', flexShrink: 0 }}>
        <AlbumArt url={state?.albumArtUrl} size={28} letter={state?.trackName?.[0] || '?'} />
      </div>
      <EQVisualizer isPlaying={isPlaying} size="nano" />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', WebkitAppRegion: 'drag' }}>
        <MarqueeText
          text={state?.trackName || 'AWAITING SIGNAL...'}
          maxWidth={100}
          style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 600, color: '#c8eeff' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 1, WebkitAppRegion: 'no-drag' }}>
        <Btn onClick={() => cmd(isPlaying ? 'pause' : 'play')} size={16}>{isPlaying ? '⏸' : '▶'}</Btn>
        <Btn onClick={() => switchMode('standard')} size={10} title="Expand">⤢</Btn>
        <Btn onClick={() => window.mpApi?.miniPlayer.hide()} size={10} title="Close">✕</Btn>
      </div>
      {/* Bottom progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 2, width: `${pct}%`,
        background: 'var(--mp-accent)', transition: 'width 0.5s linear',
      }} />
    </div>
  )
}

// ─── Standard Mode (380×100) ────────────────────────────────────────────
function StandardMode({ state, cmd, switchMode, lyrics, lyricIdx, animating }) {
  const isPlaying = state?.isPlaying
  const currentLyric = lyricIdx >= 0 && lyrics[lyricIdx] ? lyrics[lyricIdx].text : null

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(2,12,24,0.90)',
      backdropFilter: 'blur(24px)',
      border: '1px solid var(--mp-accent)55',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      animation: animating ? 'mpPulseBorder 0.6s ease' : 'none',
    }}>
      {/* Sweeping scan line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 10, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, var(--mp-accent) 50%, transparent 100%)',
        animation: 'mpScanLine 3s linear infinite', opacity: 0.55,
      }} />

      {/* Top row */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '7px 7px 3px 7px', gap: 7,
        flex: 1, minHeight: 0, WebkitAppRegion: 'drag',
      }}>
        <div style={{ WebkitAppRegion: 'no-drag', flexShrink: 0 }}>
          <AlbumArt url={state?.albumArtUrl} size={52} letter={state?.trackName?.[0] || '?'} />
        </div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 12, fontWeight: 600, color: '#c8eeff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
            animation: animating ? 'mpSlideOutLeft 250ms ease-in forwards' : 'mpSlideInRight 300ms ease-out forwards',
          }}>
            {state?.trackName || 'AWAITING SIGNAL...'}
          </div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(200,238,255,0.5)', marginTop: 1 }}>
            {state?.artistName || '—'}
          </div>
          {currentLyric && (
            <MarqueeText
              text={currentLyric}
              maxWidth={180}
              style={{ fontFamily: 'Rajdhani', fontStyle: 'italic', fontSize: 10, color: 'var(--mp-accent)', opacity: 0.85, marginTop: 2 }}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, WebkitAppRegion: 'no-drag', flexShrink: 0 }}>
          <EQVisualizer isPlaying={isPlaying} size="standard" />
          <Btn onClick={() => switchMode('nano')} size={9} title="Minimize" style={{ marginTop: 2 }}>▬</Btn>
          <Btn onClick={() => switchMode('expanded')} size={9} title="Expand">⤢</Btn>
          <Btn onClick={() => window.mpApi?.miniPlayer.hide()} size={9} title="Close">✕</Btn>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ padding: '0 7px 6px', WebkitAppRegion: 'no-drag' }}>
        <SeekBar
          progressMs={state?.progressMs || 0}
          durationMs={state?.durationMs || 0}
          onSeek={pos => cmd('seek', { positionMs: pos })}
        />
        <div style={{ marginTop: 3 }}>
          <Controls state={state} cmd={cmd} compact />
        </div>
      </div>
    </div>
  )
}

// ─── Expanded Mode (380×220) ────────────────────────────────────────────
function ExpandedMode({ state, cmd, switchMode, lyrics, lyricIdx, animating }) {
  const isPlaying = state?.isPlaying
  const prevLyric = lyricIdx > 0 ? lyrics[lyricIdx - 1]?.text : null
  const curLyric  = lyricIdx >= 0 ? lyrics[lyricIdx]?.text : null
  const nextLyric = lyrics[lyricIdx + 1]?.text || null

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(2,12,24,0.96)',
      backdropFilter: 'blur(24px)',
      border: '1px solid var(--mp-accent)55',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      animation: animating ? 'mpPulseBorder 0.6s ease' : 'none',
    }}>

      {/* Hero art (top 95px) */}
      <div style={{ position: 'relative', width: '100%', height: 95, flexShrink: 0, WebkitAppRegion: 'drag' }}>
        {state?.albumArtUrl
          ? <div style={{ width: '100%', height: '100%', backgroundImage: `url(${state.albumArtUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', animation: animating ? 'mpFadeIn 0.4s ease forwards' : 'none' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, var(--mp-accent)22 0%, #020c18 100%)' }}>
              <span style={{ fontFamily: 'Orbitron', fontSize: 36, color: 'var(--mp-accent)' }}>{state?.trackName?.[0] || '?'}</span>
            </div>
        }
        {/* Gradient fade into body */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, rgba(2,12,24,0.97) 100%)', pointerEvents: 'none' }} />
        {/* Track info */}
        <div style={{ position: 'absolute', bottom: 5, left: 8, right: 34 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 12, fontWeight: 600, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {state?.trackName || 'STANDBY'}
          </div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {state?.artistName || ''}
          </div>
        </div>
        {/* Window buttons */}
        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2, WebkitAppRegion: 'no-drag' }}>
          <Btn onClick={() => switchMode('standard')} size={9} title="Collapse">⤡</Btn>
          <Btn onClick={() => window.mpApi?.miniPlayer.hide()} size={9} title="Close">✕</Btn>
        </div>
      </div>

      {/* EQ + Lyrics */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 8px 0', gap: 3 }}>
        <EQVisualizer isPlaying={isPlaying} size="expanded" />
        {prevLyric && <div style={{ fontFamily: 'Rajdhani', fontStyle: 'italic', fontSize: 9, color: 'rgba(200,238,255,0.28)', textAlign: 'center', lineHeight: 1.2 }}>{prevLyric}</div>}
        {curLyric  && <div style={{ fontFamily: 'Rajdhani', fontStyle: 'italic', fontSize: 12, color: 'var(--mp-accent)', textAlign: 'center', textShadow: '0 0 12px var(--mp-accent-dim)', lineHeight: 1.3, animation: 'mpFadeIn 0.2s ease' }}>{curLyric}</div>}
        {nextLyric && <div style={{ fontFamily: 'Rajdhani', fontStyle: 'italic', fontSize: 9, color: 'rgba(200,238,255,0.28)', textAlign: 'center', lineHeight: 1.2 }}>{nextLyric}</div>}
      </div>

      {/* Seek + controls */}
      <div style={{ padding: '5px 8px 0', WebkitAppRegion: 'no-drag', marginTop: 'auto' }}>
        <SeekBar
          progressMs={state?.progressMs || 0}
          durationMs={state?.durationMs || 0}
          onSeek={pos => cmd('seek', { positionMs: pos })}
        />
        <div style={{ marginTop: 4 }}>
          <Controls state={state} cmd={cmd} compact={false} />
        </div>
      </div>

      {/* Up Next */}
      <div style={{ margin: '4px 8px 0', height: 1, background: 'var(--mp-accent)2a', flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px', flexShrink: 0, overflow: 'hidden' }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: 7, color: 'var(--mp-accent)', letterSpacing: 1.5, flexShrink: 0 }}>NEXT ›</span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(200,238,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {state?.nextTrack ? `${state.nextTrack.name} — ${state.nextTrack.artist}` : '—'}
        </span>
      </div>
      {/* Bottom accent stripe */}
      <div style={{ height: 2, background: 'var(--mp-accent)', boxShadow: '0 0 8px var(--mp-accent)', flexShrink: 0 }} />
    </div>
  )
}

// ─── Root MiniPlayer ────────────────────────────────────────────────────
export default function MiniPlayer() {
  const [mode, setMode] = useState('standard')
  const [state, setState] = useState(null)
  const [accent, setAccent] = useState('#00c8ff')
  const [lyrics, setLyrics] = useState([])
  const [lyricIdx, setLyricIdx] = useState(-1)
  const [isIdle, setIsIdle] = useState(false)
  const [animating, setAnimating] = useState(false)
  const lastInteraction = useRef(Date.now())

  // Inject global CSS once
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = GLOBAL_CSS
    document.head.appendChild(el)
    return () => el.remove()
  }, [])

  // IPC subscriptions
  useEffect(() => {
    const mp = window.mpApi
    if (!mp) return

    const u1 = mp.spotify.onState(s => setState(s))
    const u2 = mp.spotify.onTrackChanged(data => {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 700)
      if (data.vibrantPalette?.dominantColor) setAccent(data.vibrantPalette.dominantColor)
      lastInteraction.current = Date.now()
      setIsIdle(false)
    })
    const u3 = mp.miniPlayer.onLyrics(({ lines }) => { setLyrics(lines || []); setLyricIdx(-1) })
    const u4 = mp.miniPlayer.onSizeModeChanged(m => setMode(m))

    // Right-click context menu
    const ctxMenu = (e) => { e.preventDefault(); mp.miniPlayer.openContextMenu() }
    window.addEventListener('contextmenu', ctxMenu)

    return () => { u1?.(); u2?.(); u3?.(); u4?.(); window.removeEventListener('contextmenu', ctxMenu) }
  }, [])

  // Apply accent as CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--mp-accent', accent)
    document.documentElement.style.setProperty('--mp-accent-dim', accent + '55')
  }, [accent])

  // Lyrics sync with progress
  useEffect(() => {
    if (!lyrics.length || !state) return
    const prog = state.progressMs
    let idx = -1
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].startMs <= prog) idx = i
      else break
    }
    if (idx !== lyricIdx) setLyricIdx(idx)
  }, [state?.progressMs])

  // Idle fade
  useEffect(() => {
    const resetIdle = () => { lastInteraction.current = Date.now(); setIsIdle(false) }
    window.addEventListener('mousemove', resetIdle)
    window.addEventListener('mouseenter', resetIdle)
    window.addEventListener('click', resetIdle)
    const iv = setInterval(() => {
      if (Date.now() - lastInteraction.current > 10000) setIsIdle(true)
    }, 1000)
    return () => {
      window.removeEventListener('mousemove', resetIdle)
      window.removeEventListener('mouseenter', resetIdle)
      window.removeEventListener('click', resetIdle)
      clearInterval(iv)
    }
  }, [])

  function cmd(action, payload = {}) {
    window.mpApi?.spotify.command(action, payload)
  }

  function switchMode(newMode) {
    setMode(newMode)
    window.mpApi?.miniPlayer.setSize(newMode)
  }

  const sharedProps = { state, cmd, switchMode, lyrics, lyricIdx, animating }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      opacity: isIdle ? 0.72 : 1,
      transform: isIdle ? 'scale(0.97)' : 'scale(1)',
      transition: isIdle
        ? 'opacity 1.2s ease, transform 1.2s ease'
        : 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      {mode === 'nano'     && <NanoMode     {...sharedProps} />}
      {mode === 'standard' && <StandardMode {...sharedProps} />}
      {mode === 'expanded' && <ExpandedMode {...sharedProps} />}
    </div>
  )
}
