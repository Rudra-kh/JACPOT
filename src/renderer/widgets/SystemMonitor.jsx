import React, { useEffect, useState, useCallback } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Cpu, MemoryStick, HardDrive, Wifi, Clock, Activity } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

/** SVG Arc Gauge — 270° sweep, starts from bottom-left */
function ArcGauge({ value = 0, max = 100, color = '#00c8ff', size = 90, label, sublabel, unit = '%' }) {
  const pct = Math.min(1, Math.max(0, value / max))
  const r = (size - 12) / 2
  const cx = size / 2
  const cy = size / 2
  // 270° arc spanning from ~225° to ~495° (bottom-left → bottom-right clockwise)
  // Using pathLength=100 trick: 270/360 = 75 units of path
  const arcLen = 75
  const fillLen = pct * arcLen
  const gap = 100 - arcLen // 25 units gap at bottom
  // Rotate SVG so arc starts at bottom-left (225° from top = 135° rotation)
  const dimColor = color.replace('#', '') === color ? color : color + '33' // fallback
  const trackColor = 'rgba(0,200,255,0.08)'

  return (
    <div className="arc-gauge-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size} height={size}
          style={{ transform: 'rotate(135deg)', overflow: 'visible' }}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={5}
            pathLength={100}
            strokeDasharray={`${arcLen} ${gap}`}
            strokeLinecap="round"
          />
          {/* Fill */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            pathLength={100}
            strokeDasharray={`${fillLen} ${100 - fillLen}`}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 5px ${color})`,
              transition: 'stroke-dasharray 0.9s ease',
            }}
          />
          {/* Tick marks at start and end of arc */}
          <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="transparent" />
        </svg>
        {/* Center label */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          paddingBottom: 4,
        }}>
          <span style={{
            fontFamily: 'Orbitron',
            fontSize: size * 0.2,
            fontWeight: 700,
            color,
            lineHeight: 1,
            textShadow: `0 0 10px ${color}55`,
          }}>
            {Math.round(value)}
          </span>
          <span style={{
            fontFamily: 'Share Tech Mono',
            fontSize: size * 0.1,
            color: 'rgba(200,238,255,0.4)',
            marginTop: 2,
          }}>
            {unit}
          </span>
        </div>
      </div>
      {label && <span className="arc-gauge-label" style={{ color }}>{label}</span>}
      {sublabel && <span className="arc-gauge-label" style={{ color: 'rgba(200,238,255,0.4)', fontSize: '0.55rem' }}>{sublabel}</span>}
    </div>
  )
}

function MetricBar({ value = 0, color = 'cyan-bar', label, unit = '%', rawLeft, rawRight }) {
  const pct = Math.min(100, Math.max(0, value))
  let barColor = color
  if (color === 'auto-cpu') {
    barColor = pct > 85 ? 'red-bar' : pct > 60 ? 'gold-bar' : 'cyan-bar'
  }
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>{label}</span>
        <span style={{ fontSize: '0.62rem', fontFamily: 'Share Tech Mono', color: '#c8eeff' }}>
          {rawLeft ? `${rawLeft} / ${rawRight}` : `${pct.toFixed(1)}${unit}`}
        </span>
      </div>
      <div className="metric-bar-track">
        <div className={`metric-bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Sparkline({ data, color }) {
  const chartData = data.map((v, i) => ({ v, i }))
  return (
    <div style={{ height: 30, marginTop: 4 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${color.replace('#','')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CoreGrid({ cores }) {
  if (!cores || cores.length === 0) return null
  return (
    <div className="grid gap-0.5 mt-2" style={{ gridTemplateColumns: `repeat(${Math.min(8, cores.length)}, 1fr)` }}>
      {cores.map((load, i) => {
        const pct = Math.min(100, load || 0)
        const color = pct > 85 ? '#ff4444' : pct > 60 ? '#ffd700' : '#00c8ff'
        return (
          <div key={i} title={`Core ${i}: ${pct.toFixed(0)}%`}>
            <div style={{ height: 3, background: 'rgba(0,200,255,0.08)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SystemMonitor() {
  const metrics = useAppStore((s) => s.metrics)
  const setMetrics = useAppStore((s) => s.setMetrics)

  useEffect(() => {
    if (!window.api?.system) return
    const cleanup = window.api.system.onMetrics((data) => setMetrics(data))
    return cleanup
  }, [])

  if (!metrics) {
    return (
      <WidgetCard id="system" title="SYSTEM MONITOR" icon={Activity}>
        <div className="flex items-center justify-center py-6">
          <div className="status-dot cyan animate-pulse-glow" />
          <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono' }}>
            POLLING HARDWARE...
          </span>
        </div>
      </WidgetCard>
    )
  }

  const { cpu, ram, gpu, disk, network, uptime, processes } = metrics
  const cpuColor = cpu.usage > 85 ? '#ff4444' : cpu.usage > 60 ? '#ffd700' : '#00c8ff'

  return (
    <WidgetCard id="system" title="SYSTEM MONITOR" icon={Activity}>
      <div className="space-y-4">

        {/* ── Arc Gauge Row: CPU / RAM / GPU ── */}
        <div className="flex justify-around items-center py-1">
          <ArcGauge
            value={cpu.usage}
            color={cpuColor}
            size={82}
            label="CPU"
            sublabel={cpu.temp != null ? `${cpu.temp.toFixed(0)}°C` : undefined}
          />
          <div style={{ width: 1, height: 70, background: 'rgba(0,200,255,0.08)' }} />
          <ArcGauge
            value={ram.percent}
            color="#a855f7"
            size={82}
            label="RAM"
            sublabel={`${ram.used?.toFixed(1)}/${ram.total?.toFixed(0)}GB`}
          />
          {gpu.usage != null && (
            <>
              <div style={{ width: 1, height: 70, background: 'rgba(0,200,255,0.08)' }} />
              <ArcGauge
                value={gpu.usage}
                color="#00ff88"
                size={82}
                label="GPU"
                sublabel={gpu.vramUsed != null ? `${gpu.vramUsed.toFixed(1)}GB VRAM` : undefined}
              />
            </>
          )}
        </div>

        {/* CPU cores sparkline */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={10} style={{ color: cpuColor }} />
            <span className="hud-label-sm" style={{ fontSize: '0.58rem', color: cpuColor }}>CORES</span>
          </div>
          <CoreGrid cores={cpu.cores} />
          <Sparkline data={cpu.history} color={cpuColor} />
        </section>

        {/* RAM sparkline */}
        <section>
          <Sparkline data={ram.history} color="#a855f7" />
        </section>

        <div style={{ height: 1, background: 'rgba(0,200,255,0.06)' }} />

        {/* ── Disk ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={10} style={{ color: '#00ff88' }} />
            <span className="hud-label-sm" style={{ color: '#00ff88', textShadow: '0 0 8px rgba(0,255,136,0.4)' }}>STORAGE</span>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.58rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
              R:{disk.io?.read?.toFixed(1)} W:{disk.io?.write?.toFixed(1)} MB/s
            </span>
          </div>
          {disk.drives?.slice(0, 4).map((d) => (
            <MetricBar
              key={d.mount}
              value={d.percent}
              color="green-bar"
              label={`${d.mount}`}
              rawLeft={`${d.used.toFixed(0)}G`}
              rawRight={`${d.size.toFixed(0)}G`}
            />
          ))}
        </section>

        <div style={{ height: 1, background: 'rgba(0,200,255,0.06)' }} />

        {/* ── Network ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Wifi size={10} style={{ color: '#ff6b2b' }} />
            <span className="hud-label-sm" style={{ color: '#ff6b2b' }}>NETWORK</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(255,107,43,0.04)', borderRadius: 8, border: '1px solid rgba(255,107,43,0.12)' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', marginBottom: 2 }}>↑ UPLOAD</div>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.72rem', color: '#ff6b2b' }}>
                {network.up >= 1024 ? `${(network.up/1024).toFixed(2)} MB/s` : `${network.up?.toFixed(1)} KB/s`}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(255,107,43,0.04)', borderRadius: 8, border: '1px solid rgba(255,107,43,0.12)' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', marginBottom: 2 }}>↓ DOWNLOAD</div>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.72rem', color: '#ff6b2b' }}>
                {network.down >= 1024 ? `${(network.down/1024).toFixed(2)} MB/s` : `${network.down?.toFixed(1)} KB/s`}
              </div>
            </div>
          </div>
        </section>

        <div style={{ height: 1, background: 'rgba(0,200,255,0.06)' }} />

        {/* ── Footer stats ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Clock size={10} style={{ color: '#00c8ff' }} />
              <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>UPTIME</span>
            </div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.7rem', color: '#c8eeff' }}>{uptime}</div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Activity size={10} style={{ color: '#00c8ff' }} />
              <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>PROCESSES</span>
            </div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: '0.7rem', color: '#c8eeff' }}>{processes}</div>
          </div>
        </div>
      </div>
    </WidgetCard>
  )
}
