import React, { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'

/* â”€â”€â”€ Math helpers â”€â”€â”€ */
const polar = (cx, cy, r, deg) => ({
  x: cx + r * Math.cos((deg * Math.PI) / 180),
  y: cy + r * Math.sin((deg * Math.PI) / 180),
})
function arcPath(cx, cy, r, startDeg, sweepDeg) {
  const s = polar(cx, cy, r, startDeg)
  const e = polar(cx, cy, r, startDeg + Math.min(sweepDeg, 359.9))
  const large = sweepDeg > 180 ? '1' : '0'
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ArcGauge â€” completely self-contained arc dial with label+value
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ArcGauge({ cx, cy, r = 50, pct = 0, color, label, value, sub, strokeW = 10 }) {
  const C = color || 'var(--hud-primary)'
  const START = 135
  const SWEEP = 270
  const filled = SWEEP * Math.min(Math.max(pct, 0), 100) / 100

  const bgPath = arcPath(cx, cy, r, START, SWEEP)
  const fgPath = filled > 0.5 ? arcPath(cx, cy, r, START, filled) : null
  const tip = filled > 1 ? polar(cx, cy, r, START + filled) : null

  return (
    <g>
      {/* Track */}
      <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW} strokeLinecap="round" />
      {/* Fill */}
      {fgPath && (
        <path d={fgPath} fill="none" stroke={C} strokeWidth={strokeW} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${C}88)` }} />
      )}
      {/* Glow dot at tip */}
      {tip && <circle cx={tip.x} cy={tip.y} r={strokeW * 0.55} fill={C} opacity="0.9" />}
      {/* Value */}
      <text x={cx} y={cy - 2} textAnchor="middle" fill="white"
        fontFamily="Orbitron" fontSize="17" fontWeight="bold" letterSpacing="0.5">
        {value}
      </text>
      {/* Label */}
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(200,238,255,0.45)"
        fontFamily="Orbitron" fontSize="9" letterSpacing="2">
        {label}
      </text>
      {/* Sub-line (e.g. GB used/total) */}
      {sub && (
        <text x={cx} y={cy + 26} textAnchor="middle" fill="rgba(200,238,255,0.25)"
          fontFamily="Share Tech Mono" fontSize="8">
          {sub}
        </text>
      )}
    </g>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DiskPie â€” solid pie chart, clearly visible
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DiskPie({ drives = [], cx = 0, cy = 0, r = 95 }) {
  if (!drives || drives.length === 0) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="rgba(0,8,20,0.75)" stroke="var(--hud-primary)" strokeWidth="1.5" opacity="0.4" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="rgba(200,238,255,0.2)"
          fontFamily="Orbitron" fontSize="11" letterSpacing="3">NO DATA</text>
      </g>
    )
  }

  const drive = drives[0]
  const used = Math.min(Math.max(drive.percent || 0, 0), 100)
  const usedGB  = (drive.used || 0).toFixed(0)
  const totalGB = (drive.size || 0).toFixed(0)
  const START = -90
  const usedSweep = (used / 100) * 360
  const IR = r * 0.4   // inner radius — matches the hollow circle

  function donutArc(startDeg, sweepDeg) {
    if (sweepDeg <= 0.1) return ''
    const clamp = Math.min(sweepDeg, 359.9)
    const s0 = polar(cx, cy, r,  startDeg)
    const e0 = polar(cx, cy, r,  startDeg + clamp)
    const s1 = polar(cx, cy, IR, startDeg + clamp)
    const e1 = polar(cx, cy, IR, startDeg)
    const lg = clamp > 180 ? '1' : '0'
    return [
      `M ${s0.x} ${s0.y}`,
      `A ${r}  ${r}  0 ${lg} 1 ${e0.x} ${e0.y}`,
      `L ${s1.x} ${s1.y}`,
      `A ${IR} ${IR} 0 ${lg} 0 ${e1.x} ${e1.y}`,
      'Z'
    ].join(' ')
  }

  const usedPath = donutArc(START, usedSweep)
  const freePath = donutArc(START + usedSweep, 360 - usedSweep)
  const junctionPt1 = polar(cx, cy, IR + 4, START + usedSweep)
  const junctionPt2 = polar(cx, cy, r  - 4, START + usedSweep)

  return (
    <g>
      {/* Dark base fill */}
      <circle cx={cx} cy={cy} r={r} fill="rgba(0,8,20,0.82)" />
      {/* Free slice */}
      {freePath && (
        <path d={freePath} fill="rgba(20,80,120,0.22)" stroke="rgba(0,200,255,0.2)" strokeWidth="0.5" />
      )}
      {/* Used slice â€” solid, clearly visible */}
      {usedPath && used > 0 && (
        <path d={usedPath} fill="var(--hud-primary)" opacity="0.38" stroke="var(--hud-primary)" strokeWidth="1" />
      )}
      {/* Junction tick between used/free */}
      {used > 0.5 && used < 99.5 && (
        <line x1={junctionPt1.x} y1={junctionPt1.y}
          x2={junctionPt2.x} y2={junctionPt2.y}
          stroke="var(--hud-accent)" strokeWidth="3" opacity="0.9"
          strokeLinecap="round" />
      )}
      {/* Inner hollow circle — drawn last so it covers any arc overpaint */}
      <circle cx={cx} cy={cy} r={IR} fill="rgba(0,6,16,0.92)"
        stroke="var(--hud-primary)" strokeWidth="1" opacity="0.35" />
      {/* Center text */}
      <text x={cx} y={cy - 10} textAnchor="middle"
        fill="var(--hud-primary)" fontFamily="Orbitron" fontSize="16" fontWeight="bold">
        {Math.round(used)}%
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle"
        fill="rgba(200,238,255,0.65)" fontFamily="Share Tech Mono" fontSize="11">
        {usedGB}GB
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle"
        fill="rgba(200,238,255,0.35)" fontFamily="Share Tech Mono" fontSize="9">
        / {totalGB}GB
      </text>
    </g>
  )
}

/* â”€â”€â”€ FPS history â”€â”€â”€ */
const fpsHistory = Array(20).fill(0)

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN COMPONENT â€” ViewBox 900 Ã— 640
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function HUDCenter() {
  const metrics = useAppStore((s) => s.metrics)
  const mobile  = useAppStore((s) => s.mobile)
  const [time, setTime] = useState(new Date())
  const [fps, setFps]        = useState(0)
  const [driveIdx, setDriveIdx] = useState(0)
  const fpsRef = useRef({ frames: 0, last: performance.now() })

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let rafId
    const tick = () => {
      fpsRef.current.frames++
      const now = performance.now()
      if (now - fpsRef.current.last >= 1000) {
        const f = Math.round(fpsRef.current.frames * 1000 / (now - fpsRef.current.last))
        fpsRef.current = { frames: 0, last: now }
        fpsHistory.push(f); fpsHistory.shift()
        setFps(f)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  useEffect(() => {
    const len = metrics?.disk?.drives?.length ?? 0
    if (len <= 1) return
    const t = setInterval(() => setDriveIdx(i => (i + 1) % len), 4000)
    return () => clearInterval(t)
  }, [metrics?.disk?.drives?.length])

  // Clock helpers â€” guaranteed zero-padded
  const pad2 = (n) => String(n).padStart(2, '0')
  const fmtHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  const fmtSS   = (d) => pad2(d.getSeconds())
  const fmtDate = (d) => d.toLocaleDateString([], {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  }).toUpperCase()

  const m       = metrics
  const cpu     = m?.cpu?.usage   ?? 0
  const ram     = m?.ram?.percent ?? 0
  const ramGB   = m?.ram?.used    ?? 0
  const ramTot  = m?.ram?.total   ?? 0
  const gpuPct  = m?.gpu?.usage   ?? null
  const vramU   = m?.gpu?.vramUsed  ?? null
  const vramT   = m?.gpu?.vramTotal ?? null
  const temp    = m?.cpu?.temp    ?? null
  const battTemp = m?.battTemp     ?? null
  // Battery temp preferred; fall back to CPU thermal zone
  const displayTemp = battTemp ?? temp
  const cpuGhz  = m?.cpu?.ghz     ?? null
  const drives     = m?.disk?.drives ?? []
  const activeDrive = drives.length > 0 ? drives[driveIdx % drives.length] : null
  const netUp       = m?.network?.up  ?? 0
  const netDn   = m?.network?.down ?? 0
  const sysBattery = m?.battery   // { percent, isCharging, hasBattery }
  const battery = sysBattery?.hasBattery ? sysBattery.percent : (mobile?.battery ?? null)
  const coreCount  = m?.cpu?.cores?.length ?? null
  const procCount  = m?.processes ?? null

  // Format network speed nicely
  const fmtNet = (kbs) => {
    const kbps = kbs * 8
    return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${Math.round(kbps)} Kbps`
  }

  // Temperature colour
  const tempColor = displayTemp == null ? 'var(--hud-primary)'
    : displayTemp > 55 ? '#ef4444'
    : displayTemp > 45 ? '#f97316'
    : displayTemp > 38 ? '#fbbf24'
    : 'var(--hud-primary)'

  // Battery colour
  const battColor = battery == null ? 'var(--hud-primary)'
    : battery < 20 ? '#ef4444'
    : battery < 50 ? '#f97316'
    : 'var(--hud-primary)'

  // ViewBox constants
  const VW = 900; const VH = 640
  const CX = 450; const CY = 315       // Disk pie center
  const PIE_R = 95
  // Left arcs: stacked vertically, same cx
  const LA_X = 165
  const LA_CPU_Y = 185
  const LA_RAM_Y = 318
  // Right arcs: stacked vertically, same cx
  const RA_X = 735
  const RA_GPU_Y = 185
  const RA_NPU_Y = 318

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <filter id="hglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* â”€â”€ OUTER FRAME: octagonal cut-corner border â”€â”€ */}
        <path
          d="M 108 92 L 792 92 L 820 118 L 820 618 L 792 640 L 108 640 L 80 618 L 80 118 Z"
          fill="none" stroke="var(--hud-primary)" strokeWidth="0.8" opacity="0.2"
        />
        {/* Corner accent brackets â€” all aligned to the frame path corners */}
        <polyline points="108,92 80,92 80,122"   fill="none" stroke="var(--hud-primary)" strokeWidth="2.2" opacity="0.75" />
        <polyline points="792,92 820,92 820,122"  fill="none" stroke="var(--hud-primary)" strokeWidth="2.2" opacity="0.75" />
        <polyline points="108,640 80,640 80,614"  fill="none" stroke="var(--hud-primary)" strokeWidth="2.2" opacity="0.75" />
        <polyline points="792,640 820,640 820,614" fill="none" stroke="var(--hud-primary)" strokeWidth="2.2" opacity="0.75" />
        {/* Hatched corner accents */}
        <rect x="82"  y="92"  width="30" height="8" fill="var(--hud-primary)" opacity="0.08" />
        <rect x="788" y="92"  width="30" height="8" fill="var(--hud-primary)" opacity="0.08" />

        {/* â”€â”€ TOP: CLOCK â”€â”€ */}
        <text x={CX} y="54" textAnchor="middle" fill="white" fontFamily="Orbitron"
          fontSize="44" fontWeight="bold" letterSpacing="5" filter="url(#hglow)">
          {fmtHHMM(time)}
          <tspan fill="white" opacity="0.45" fontSize="21" letterSpacing="2">:{fmtSS(time)}</tspan>
        </text>
        <text x={CX} y="70" textAnchor="middle" fill="rgba(200,238,255,0.28)"
          fontFamily="Share Tech Mono" fontSize="10" letterSpacing="3">
          {fmtDate(time)}
        </text>
        {/* Tick ruler */}
        <line x1="200" y1="79" x2="700" y2="79" stroke="var(--hud-primary)" strokeWidth="0.4" opacity="0.35" />
        {[-80,-60,-40,-20,0,20,40,60,80].map(o => (
          <line key={o} x1={CX + o} y1="76" x2={CX + o} y2={o === 0 ? 85 : 83}
            stroke={o === 0 ? 'white' : 'var(--hud-primary)'}
            strokeWidth={o === 0 ? 2 : 1} opacity={o === 0 ? 1 : 0.4} />
        ))}

        {/* â”€â”€ DECORATIVE OUTER RING (rotating) â”€â”€ */}
        <circle cx={CX} cy={CY} r="268" fill="none" stroke="var(--hud-secondary)"
          strokeWidth="0.6" strokeDasharray="5 16" opacity="0.12">
          <animateTransform attributeName="transform" type="rotate"
            from={`360 ${CX} ${CY}`} to={`0 ${CX} ${CY}`} dur="90s" repeatCount="indefinite" />
        </circle>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            LEFT COLUMN â€” COMPUTE
            CPU (top) then RAM (below) â€” STACKED, same cx
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <text x="92" y="107" fill="var(--hud-primary)" fontFamily="Orbitron"
          fontSize="9" letterSpacing="3" opacity="0.7">PERFORMANCE</text>
        <line x1="92" y1="111" x2="242" y2="111" stroke="var(--hud-primary)" strokeWidth="0.6" opacity="0.25" />

        {/* CPU â€” top */}
        <ArcGauge cx={LA_X} cy={LA_CPU_Y} r={50} pct={cpu}
          color="var(--hud-primary)"
          label="CPU"
          value={`${cpu.toFixed(0)}%`}
        />

        {/* Separator between CPU and RAM */}
        <line x1="108" y1="252" x2="222" y2="252" stroke="var(--hud-primary)" strokeWidth="0.4" opacity="0.15" strokeDasharray="3 5" />

        {/* RAM â€” below CPU */}
        <ArcGauge cx={LA_X} cy={LA_RAM_Y} r={50} pct={ram}
          color="var(--hud-secondary)"
          label="RAM"
          value={`${ram.toFixed(0)}%`}
          sub={`${ramGB.toFixed(1)}/${ramTot.toFixed(0)}GB`}
        />

        {/* ETHERNET â€” below RAM */}
        <text x="92" y="402" fill="rgba(200,238,255,0.38)" fontFamily="Orbitron"
          fontSize="8" letterSpacing="2">ETHERNET</text>
        <line x1="92" y1="406" x2="242" y2="406" stroke="var(--hud-primary)" strokeWidth="0.4" opacity="0.2" />

        {/* Upload */}
        <text x="92"  y="421" fill="rgba(200,238,255,0.32)" fontFamily="Orbitron" fontSize="8">{'>>'} UP</text>
        <text x="242" y="421" textAnchor="end" fill="var(--hud-primary)"
          fontFamily="Share Tech Mono" fontSize="13" fontWeight="bold">{fmtNet(netUp)}</text>
        <rect x="92" y="424" width="150" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />
        <rect x="92" y="424"
          width={Math.min(150, 150 * Math.min(netUp, 50000) / 50000)}
          height="3" rx="1.5" fill="var(--hud-primary)" opacity="0.75" />

        {/* Download */}
        <text x="92"  y="440" fill="rgba(200,238,255,0.32)" fontFamily="Orbitron" fontSize="8">{'>>'} DN</text>
        <text x="242" y="440" textAnchor="end" fill="var(--hud-accent)"
          fontFamily="Share Tech Mono" fontSize="13" fontWeight="bold">{fmtNet(netDn)}</text>
        <rect x="92" y="443" width="150" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />
        <rect x="92" y="443"
          width={Math.min(150, 150 * Math.min(netDn, 50000) / 50000)}
          height="3" rx="1.5" fill="var(--hud-accent)" opacity="0.75" />

        {/* Connector lines â†’ center pie */}
        <line x1="216" y1="200" x2="352" y2="283" stroke="var(--hud-primary)"
          strokeWidth="0.5" strokeDasharray="4 7" opacity="0.14" />
        <line x1="216" y1="332" x2="352" y2="317" stroke="var(--hud-primary)"
          strokeWidth="0.5" strokeDasharray="4 7" opacity="0.11" />

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            CENTER â€” DISK PIE CHART
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <text x={CX} y="178" textAnchor="middle" fill="rgba(200,238,255,0.45)"
          fontFamily="Orbitron" fontSize="10" letterSpacing="4">STORAGE</text>
        <line x1={CX - 90} y1="183" x2={CX + 90} y2="183"
          stroke="var(--hud-primary)" strokeWidth="0.5" opacity="0.2" />

        <DiskPie drives={activeDrive ? [activeDrive] : []} cx={CX} cy={CY} r={PIE_R} />

        {/* Slow decorative rings around pie */}
        <circle cx={CX} cy={CY} r={PIE_R + 16} fill="none"
          stroke="var(--hud-primary)" strokeWidth="0.8" strokeDasharray="6 18" opacity="0.28">
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="32s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r={PIE_R + 28} fill="none"
          stroke="var(--hud-secondary)" strokeWidth="0.5" strokeDasharray="3 22" opacity="0.14">
          <animateTransform attributeName="transform" type="rotate"
            from={`360 ${CX} ${CY}`} to={`0 ${CX} ${CY}`} dur="20s" repeatCount="indefinite" />
        </circle>

        {/* Legend below pie -- below the outer decorative ring */}
        <rect x={CX - 60} y={CY + PIE_R + 45} width="11" height="11" rx="2"
          fill="var(--hud-primary)" opacity="0.75" />
        <text x={CX - 44} y={CY + PIE_R + 55} fill="rgba(200,238,255,0.55)"
          fontFamily="Share Tech Mono" fontSize="10">USED</text>
        <rect x={CX + 28} y={CY + PIE_R + 45} width="11" height="11" rx="2"
          fill="rgba(20,80,120,0.4)" stroke="var(--hud-primary)" strokeWidth="1" />
        <text x={CX + 44} y={CY + PIE_R + 55} fill="rgba(200,238,255,0.55)"
          fontFamily="Share Tech Mono" fontSize="10">FREE</text>

        {/* Drive cycle indicator dots */}
        {drives.length > 1 && drives.map((d, i) => {
          const active = i === driveIdx % drives.length
          const dotX = CX + (i - (drives.length - 1) / 2) * 18
          return (
            <g key={i}>
              <circle cx={dotX} cy={CY + PIE_R + 68}
                r={active ? 5 : 3}
                fill={active ? 'var(--hud-primary)' : 'none'}
                stroke="var(--hud-primary)" strokeWidth={active ? 0 : 1}
                opacity={active ? 0.9 : 0.3} />
              <text x={dotX} y={CY + PIE_R + 80} textAnchor="middle"
                fill="rgba(200,238,255,0.3)" fontFamily="Orbitron" fontSize="7">
                {d.mount}
              </text>
            </g>
          )
        })}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            RIGHT COLUMN â€” GRAPHICS
            GPU (top) then NPU (below) â€” STACKED, same cx
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <text x="808" y="107" textAnchor="end" fill="var(--hud-primary)" fontFamily="Orbitron"
          fontSize="9" letterSpacing="3" opacity="0.7">GRAPHICS</text>
        <line x1="658" y1="111" x2="808" y2="111" stroke="var(--hud-primary)" strokeWidth="0.6" opacity="0.25" />

        {/* GPU â€” top */}
        <ArcGauge cx={RA_X} cy={RA_GPU_Y} r={50} pct={gpuPct ?? 0}
          color="#7c3aed"
          label="GPU"
          value={gpuPct != null ? `${gpuPct.toFixed(0)}%` : 'N/A'}
          sub={vramU != null ? `${vramU.toFixed(1)}/${vramT?.toFixed(0) ?? '?'}G` : null}
        />

        {/* Separator */}
        <line x1="678" y1="252" x2="792" y2="252" stroke="var(--hud-primary)" strokeWidth="0.4" opacity="0.15" strokeDasharray="3 5" />

        {/* NPU â€” below GPU */}
        <ArcGauge cx={RA_X} cy={RA_NPU_Y} r={50} pct={0}
          color="#06b6d4"
          label="NPU"
          value="N/A"
        />

        {/* Connector lines â†’ center pie */}
        <line x1="684" y1="200" x2="548" y2="283" stroke="var(--hud-primary)"
          strokeWidth="0.5" strokeDasharray="4 7" opacity="0.14" />
        <line x1="684" y1="332" x2="548" y2="317" stroke="var(--hud-primary)"
          strokeWidth="0.5" strokeDasharray="4 7" opacity="0.11" />

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            BOTTOM STRIP â€” FPS Â· TEMP Â· FAN Â· BATTERY
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <line x1="90" y1="494" x2="810" y2="494" stroke="var(--hud-primary)" strokeWidth="0.6" opacity="0.22" />

        {/* â”€â”€ FPS (leftmost) â”€â”€ */}
        {/* sparkline bars */}
        <text x="100" y="510" fill="rgba(200,238,255,0.3)" fontFamily="Orbitron" fontSize="8" letterSpacing="1">FPS</text>
        {fpsHistory.map((v, i) => {
          const bh = Math.max(2, Math.round((v / 120) * 26))
          return (
            <rect key={i} x={100 + i * 5} y={526 - bh} width="3" height={bh}
              rx="1" fill="var(--hud-primary)" opacity={0.15 + i * 0.045} />
          )
        })}
        {/* FPS value to the right of sparkline */}
        <text x="207" y="521" fill="var(--hud-primary)" fontFamily="Share Tech Mono"
          fontSize="22" fontWeight="bold">{fps}</text>
        <text x="207" y="536" fill="rgba(200,238,255,0.3)" fontFamily="Orbitron" fontSize="7" letterSpacing="1">FPS</text>

        {/* Divider */}
        <line x1="258" y1="498" x2="258" y2="552" stroke="var(--hud-primary)" strokeWidth="0.5" opacity="0.18" />

        {/* â”€â”€ BATTERY â”€â”€ */}
        <text x="275" y="510" fill="rgba(200,238,255,0.35)" fontFamily="Orbitron" fontSize="8" letterSpacing="2">BATTERY</text>
        {battery != null ? (
          <>
            <text x="275" y="538" fill={battColor} fontFamily="Share Tech Mono" fontSize="28" fontWeight="bold">
              {Math.round(battery)}
            </text>
            <text x="315" y="538" fill="rgba(200,238,255,0.4)" fontFamily="Share Tech Mono" fontSize="14">%</text>
            {sysBattery?.isCharging && (
              <text x="333" y="523" fill="#fbbf24" fontFamily="Share Tech Mono" fontSize="12">&#x26A1;</text>
            )}
            {/* Battery icon */}
            <rect x="351" y="519" width="30" height="16" rx="3"
              fill="none" stroke="rgba(200,238,255,0.28)" strokeWidth="1.4" />
            <rect x="381" y="524" width="5" height="6" rx="1.5" fill="rgba(200,238,255,0.28)" />
            <rect x="352.5" y="520.5"
              width={Math.max(1, Math.round(27 * battery / 100))}
              height="13" rx="2" fill={battColor} opacity="0.82" />
          </>
        ) : (
          <g>
            <text x="275" y="535" fill="rgba(200,238,255,0.28)" fontFamily="Share Tech Mono" fontSize="18">N/A</text>
            <text x="275" y="548" fill="rgba(200,238,255,0.18)" fontFamily="Orbitron" fontSize="7" letterSpacing="1">NO BATTERY</text>
          </g>
        )}

        {/* â”€â”€ UPTIME footer â”€â”€ */}
        {/* ── CORES ── */}
        <line x1="405" y1="498" x2="405" y2="552" stroke="var(--hud-primary)" strokeWidth="0.5" opacity="0.18" />
        <text x="420" y="510" fill="rgba(200,238,255,0.35)" fontFamily="Orbitron" fontSize="8" letterSpacing="2">CORES</text>
        <text x="420" y="538" fill="var(--hud-primary)" fontFamily="Share Tech Mono" fontSize="28" fontWeight="bold">
          {coreCount ?? '--'}
        </text>
        <text x="420" y="551" fill="rgba(200,238,255,0.28)" fontFamily="Orbitron" fontSize="7" letterSpacing="1">THREADS</text>

        {/* ── PROCESSES ── */}
        <line x1="490" y1="498" x2="490" y2="552" stroke="var(--hud-primary)" strokeWidth="0.5" opacity="0.18" />
        <text x="505" y="510" fill="rgba(200,238,255,0.35)" fontFamily="Orbitron" fontSize="7" letterSpacing="1">PROCESS</text>
        <text x="505" y="538" fill="var(--hud-secondary)" fontFamily="Share Tech Mono" fontSize="28" fontWeight="bold">
          {procCount ?? '--'}
        </text>
        <text x="505" y="551" fill="rgba(200,238,255,0.28)" fontFamily="Orbitron" fontSize="7" letterSpacing="1">RUNNING</text>

        {/* ── UPTIME footer ── */}
        <line x1="90" y1="558" x2="810" y2="558" stroke="var(--hud-primary)" strokeWidth="0.5" opacity="0.4" />
        <text x={CX} y="572" textAnchor="middle" fill="rgba(200,238,255,0.6)"
          fontFamily="Share Tech Mono" fontSize="9" letterSpacing="2">
          UPTIME  {m?.uptime ?? '-- -- --'}
        </text>

      </svg>

      <style>{`
        @keyframes spin      { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes spin-rev  { from { transform: rotate(360deg); } to { transform: rotate(0deg);    } }
      `}</style>
    </div>
  )
}
