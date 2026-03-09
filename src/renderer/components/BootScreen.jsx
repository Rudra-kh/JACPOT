import React, { useEffect, useState } from 'react'

const BOOT_LINES = [
  'INITIALIZING SYSTEMS...',
  'LOADING HARDWARE MODULES...',
  'CONNECTING TO MOBILE DEVICE...',
  'SYNCING CLIPBOARD ENGINE...',
  'MOUNTING SQLITE DATABASE...',
  'ESTABLISHING SPOTIFY BRIDGE...',
  'CALIBRATING HUD INTERFACE...',
  'ALL SYSTEMS NOMINAL.',
]

export default function BootScreen({ onComplete }) {
  const [logoChars, setLogoChars] = useState([])
  const [lines, setLines] = useState([])
  const [done, setDone] = useState(false)
  const logoText = 'JACPOTE'

  useEffect(() => {
    // Type out logo letter by letter
    let i = 0
    const logoTimer = setInterval(() => {
      if (i < logoText.length) {
        setLogoChars((c) => [...c, logoText[i]])
        i++
      } else {
        clearInterval(logoTimer)
        // Start printing boot lines
        let lineIdx = 0
        const lineTimer = setInterval(() => {
          if (lineIdx < BOOT_LINES.length) {
            setLines((l) => [...l, BOOT_LINES[lineIdx]])
            lineIdx++
          } else {
            clearInterval(lineTimer)
            setTimeout(() => {
              setDone(true)
              setTimeout(onComplete, 600)
            }, 400)
          }
        }, 260)
      }
    }, 100)
    return () => clearInterval(logoTimer)
  }, [])

  return (
    <div
      className={`boot-screen transition-opacity duration-700 ${done ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#020c18' }}
    >
      {/* Ambient grid */}
      <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />

      {/* Concentric ring decorations — centered, slowly rotating */}
      {[320, 480, 640, 800].map((size, i) => (
        <div key={size} style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size, height: size,
          borderRadius: '50%',
          border: `1px solid rgba(0,200,255,${0.06 - i * 0.01})`,
          animation: `rotateRing ${20 + i * 8}s linear infinite ${i % 2 === 1 ? 'reverse' : ''}`,
          pointerEvents: 'none',
        }} />
      ))}
      {/* Inner glow ring */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 120, height: 120, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,200,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo + circular ring frame */}
        <div className="flex flex-col items-center gap-2" style={{ position: 'relative' }}>
          {/* Outer logo ring */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 200, height: 200, borderRadius: '50%',
            border: '2px solid rgba(0,200,255,0.12)',
            boxShadow: '0 0 30px rgba(0,200,255,0.06)',
            animation: 'rotateRing 15s linear infinite',
            pointerEvents: 'none',
          }} />
          <div className="boot-logo tracking-widest">
            {logoChars.map((ch, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.08}s`, animation: 'fadeIn 0.3s ease forwards' }}>
                {ch}
              </span>
            ))}
            {logoChars.length < logoText.length && <span className="boot-cursor" />}
          </div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: '0.7rem', color: 'rgba(200,238,255,0.4)', letterSpacing: '0.4em' }}>
            JUST A COOL PROJECT ON TUESDAY EVENING
          </div>
        </div>

        {/* Arc separator */}
        <div style={{
          width: 240, height: 1,
          background: 'radial-gradient(ellipse at center, rgba(0,200,255,0.6) 0%, transparent 70%)',
          boxShadow: '0 0 8px rgba(0,200,255,0.3)',
        }} />

        {/* Boot log */}
        <div className="flex flex-col gap-1 min-h-[200px] w-80">
          {lines.map((line, i) => (
            <div
              key={i}
              className="boot-line flex items-center gap-3"
              style={{ animation: 'fadeIn 0.2s ease forwards', opacity: 0 }}
            >
              <span style={{ color: '#00c8ff', fontSize: '0.55rem' }}>◈</span>
              <span>{line}</span>
              {i === lines.length - 1 && lines.length < BOOT_LINES.length && (
                <span className="boot-cursor" style={{ width: '6px', height: '0.75em' }} />
              )}
            </div>
          ))}
        </div>

        {/* Circular arc progress gauge */}
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <svg width={80} height={80} style={{ transform: 'rotate(135deg)', overflow: 'visible' }}>
            <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(0,200,255,0.08)" strokeWidth={4}
              pathLength={100} strokeDasharray="75 25" strokeLinecap="round" />
            <circle cx={40} cy={40} r={32} fill="none" stroke="#00c8ff" strokeWidth={4}
              pathLength={100}
              strokeDasharray={`${(lines.length / BOOT_LINES.length) * 75} ${100 - (lines.length / BOOT_LINES.length) * 75}`}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 5px #00c8ff)', transition: 'stroke-dasharray 0.25s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            paddingBottom: 4,
          }}>
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', color: '#00c8ff' }}>
              {Math.round((lines.length / BOOT_LINES.length) * 100)}%
            </span>
          </div>
        </div>

        {/* Version tag */}
        <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: 'rgba(200,238,255,0.2)' }}>
          v1.0.0 — BUILD 2026.03.03
        </div>
      </div>
    </div>
  )
}
