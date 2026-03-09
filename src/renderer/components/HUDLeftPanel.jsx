import React, { useEffect, useState } from 'react'
import { Cpu, MemoryStick, Smartphone, Clock, HardDrive, Activity } from 'lucide-react'
import CircleWidget, { CLabel, CValue, CDivider } from './CircleWidget'
import { useAppStore } from '../store/appStore'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

/** SVG arc gauge used inside circles */
function ArcInCircle({ value, max = 100, color, size }) {
  const r = (size - 14) / 2
  const cx = size / 2, cy = size / 2
  const pct = Math.min(1, Math.max(0, value / max))
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(135deg)', overflow: 'visible', position: 'absolute', inset: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,200,255,0.07)" strokeWidth={5}
        pathLength={100} strokeDasharray="75 25" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5}
        pathLength={100} strokeDasharray={`${pct * 75} ${100 - pct * 75}`} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dasharray 0.9s ease' }} />
    </svg>
  )
}

/** Live digital clock */
function ClockCircle() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const h = time.getHours().toString().padStart(2, '0')
  const m = time.getMinutes().toString().padStart(2, '0')
  const s = time.getSeconds().toString().padStart(2, '0')
  const day = ['SUN','MON','TUE','WED','THU','FRI','SAT'][time.getDay()]
  const dateStr = `${time.getDate().toString().padStart(2,'0')}.${(time.getMonth()+1).toString().padStart(2,'0')}`

  return (
    <CircleWidget size={150} color="#00c8ff">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CLabel>{day} {dateStr}</CLabel>
        <CValue color="#00c8ff" size="1.6rem">{h}:{m}</CValue>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.7rem', color: 'rgba(0,200,255,0.5)', letterSpacing: '0.05em' }}>:{s}</span>
        <CDivider />
        <CLabel color="rgba(200,238,255,0.3)">LOCAL TIME</CLabel>
      </div>
    </CircleWidget>
  )
}

/** CPU gauge circle */
function CPUCircle({ cpu }) {
  const color = cpu.usage > 85 ? '#ff4444' : cpu.usage > 60 ? '#ffd700' : '#00c8ff'
  return (
    <CircleWidget size={150} color={color}>
      <ArcInCircle value={cpu.usage} color={color} size={150} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 8 }}>
        <Cpu size={13} style={{ color, marginBottom: 4, opacity: 0.7 }} />
        <CValue color={color} size="1.5rem">{Math.round(cpu.usage)}</CValue>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color: 'rgba(200,238,255,0.35)' }}>%</span>
        {cpu.temp != null && (
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.6rem', color: '#ffd700', marginTop: 2 }}>{cpu.temp.toFixed(0)}°C</span>
        )}
        <CDivider color={`${color}33`} />
        <CLabel color={color}>PROCESSOR</CLabel>
      </div>
    </CircleWidget>
  )
}

/** RAM gauge circle */
function RAMCircle({ ram }) {
  return (
    <CircleWidget size={150} color="#a855f7">
      <ArcInCircle value={ram.percent} color="#a855f7" size={150} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 8 }}>
        <MemoryStick size={13} style={{ color: '#a855f7', marginBottom: 4, opacity: 0.7 }} />
        <CValue color="#a855f7" size="1.5rem">{Math.round(ram.percent)}</CValue>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color: 'rgba(200,238,255,0.35)' }}>%</span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.62rem', color: 'rgba(168,85,247,0.7)', marginTop: 2 }}>
          {ram.used?.toFixed(1)}/{ram.total?.toFixed(0)}GB
        </span>
        <CDivider color="rgba(168,85,247,0.25)" />
        <CLabel color="#a855f7">MEMORY</CLabel>
      </div>
    </CircleWidget>
  )
}

/** Disk I/O circle */
function DiskCircle({ disk }) {
  const usedPct = disk?.drives?.[0]?.percent ?? 0
  return (
    <CircleWidget size={150} color="#00ff88">
      <ArcInCircle value={usedPct} color="#00ff88" size={150} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 8 }}>
        <HardDrive size={13} style={{ color: '#00ff88', marginBottom: 4, opacity: 0.7 }} />
        <CValue color="#00ff88" size="1.4rem">{Math.round(usedPct)}</CValue>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.55rem', color: 'rgba(200,238,255,0.35)' }}>%</span>
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.58rem', color: 'rgba(0,255,136,0.6)', marginTop: 2 }}>
          {disk?.drives?.[0]?.mount ?? 'C:'}
        </span>
        <CDivider color="rgba(0,255,136,0.2)" />
        <CLabel color="#00ff88">STORAGE</CLabel>
      </div>
    </CircleWidget>
  )
}

/** Uptime + process count circle */
function UptimeCircle({ uptime, processes }) {
  return (
    <CircleWidget size={150} color="rgba(0,200,255,0.5)">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Activity size={14} style={{ color: '#00c8ff', opacity: 0.6 }} />
        <CLabel>UPTIME</CLabel>
        <CValue color="#c8eeff" size="0.85rem">{uptime}</CValue>
        <CDivider />
        <CLabel>PROCESSES</CLabel>
        <CValue color="#00c8ff" size="1.1rem">{processes}</CValue>
      </div>
    </CircleWidget>
  )
}

export default function HUDLeftPanel({ onDeepDive }) {
  const metrics = useAppStore((s) => s.metrics)
  const setMetrics = useAppStore((s) => s.setMetrics)

  useEffect(() => {
    if (!window.api?.system) return
    const cleanup = window.api.system.onMetrics((data) => setMetrics(data))
    return cleanup
  }, [])

  if (!metrics) {
    return (
      <div className="hud-side-col" style={{ justifyContent: 'center' }}>
        {[150, 150, 150, 150].map((s, i) => (
          <div key={i} className="circle-widget" style={{ width: s, height: s, justifyContent: 'center' }}>
            <span className="status-dot cyan" />
          </div>
        ))}
      </div>
    )
  }

  const { cpu, ram, disk, uptime, processes } = metrics

  return (
    <div className="hud-side-col" style={{ justifyContent: 'flex-start' }}>
      <ClockCircle />
      <CPUCircle cpu={cpu} />
      <RAMCircle ram={ram} />
      <DiskCircle disk={disk} />
      <UptimeCircle uptime={uptime} processes={processes} />
    </div>
  )
}
