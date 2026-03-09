import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Camera, Maximize2, Minimize2, ZapIcon, Image, AlertTriangle } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

const QUALITY_OPTIONS = [
  { label: 'LOW',  value: 'low',    res: '480p' },
  { label: 'MED',  value: 'medium', res: '720p' },
  { label: 'HIGH', value: 'high',   res: '1080p' },
]

export default function RemoteCamera() {
  const mobile = useAppStore((s) => s.mobile)
  const addToast = useAppStore((s) => s.addToast)
  const [streamUrl, setStreamUrl] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [quality, setQuality] = useState('medium')
  const [fps, setFps] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [camera, setCamera] = useState('rear')
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const fpsRef = useRef({ count: 0, last: Date.now() })

  const startStream = useCallback(async () => {
    const url = await window.api?.camera.getUrl(mobile.deviceId)
    if (!url) {
      addToast({ title: 'CAMERA', message: 'Phone IP not configured. Set it in Settings.', type: 'warning' })
      return
    }
    setStreamUrl(url)
    setStreaming(true)
  }, [mobile.deviceId])

  const stopStream = useCallback(() => {
    setStreamUrl(null)
    setStreaming(false)
    setFps(0)
    setTorchOn(false)
  }, [])

  // FPS counter
  useEffect(() => {
    if (!streaming) return
    const iv = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - fpsRef.current.last) / 1000
      const currentFps = fpsRef.current.count / elapsed
      setFps(Math.round(currentFps))
      fpsRef.current = { count: 0, last: now }
    }, 1000)
    return () => clearInterval(iv)
  }, [streaming])

  function handleImgLoad() {
    fpsRef.current.count++
  }

  async function handleSnapshot() {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    // Copy to clipboard
    const blob = await (await fetch(dataUrl)).blob()
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]) } catch {}
    addToast({ title: 'CAMERA', message: 'Snapshot saved to clipboard.', type: 'success' })
  }

  async function handleTorch() {
    const next = !torchOn
    setTorchOn(next)
    await window.api?.camera.torch({ on: next })
  }

  const streamContent = streaming && streamUrl ? (
    <div className="relative" style={{ background: '#000', borderRadius: 2 }}>
      {/* LIVE badge */}
      <div className="absolute top-2 left-2 z-10 live-badge flex items-center gap-1.5">
        <span className="status-dot offline" style={{ width: 5, height: 5, animationDuration: '1s' }} />
        LIVE
      </div>
      {/* FPS overlay */}
      <div
        className="absolute top-2 right-2 z-10"
        style={{
          fontFamily: 'Share Tech Mono', fontSize: '0.55rem',
          color: '#00c8ff', background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 2,
        }}
      >
        {fps} FPS
      </div>
      {/* Stream */}
      <img
        ref={imgRef}
        src={streamUrl}
        alt="Camera stream"
        onLoad={handleImgLoad}
        style={{ width: '100%', display: 'block', borderRadius: 2 }}
        onError={() => {
          addToast({ title: 'CAMERA', message: 'Stream disconnected.', type: 'error' })
          stopStream()
        }}
      />
      {/* Hidden canvas for snapshots */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  ) : (
    /* NO SIGNAL placeholder */
    <div
      className="no-signal flex flex-col items-center justify-center gap-2 rounded"
      style={{ height: 160, background: 'rgba(0,0,0,0.5)' }}
    >
      <AlertTriangle size={28} style={{ color: 'rgba(0,200,255,0.2)' }} />
      <span style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', color: 'rgba(0,200,255,0.35)', letterSpacing: '0.2em' }}>NO SIGNAL</span>
      <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', textAlign: 'center', maxWidth: 200 }}>
        Start IP Webcam on your phone, then click Start Camera.
      </span>
    </div>
  )

  const content = (
    <div className="space-y-2">
      {/* Stream view */}
      {fullscreen ? (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="relative flex-1">{streamContent}</div>
          <button
            className="absolute top-3 right-3 hud-btn"
            onClick={() => setFullscreen(false)}
          >
            <Minimize2 size={12} />
          </button>
        </div>
      ) : streamContent}

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {!streaming ? (
          <button className="hud-btn flex items-center gap-1.5" onClick={startStream}>
            <Camera size={10} /> START CAMERA
          </button>
        ) : (
          <button className="hud-btn danger flex items-center gap-1.5" onClick={stopStream}>
            STOP
          </button>
        )}

        {streaming && (
          <>
            <button className="hud-btn flex items-center gap-1" onClick={handleSnapshot}>
              <Image size={9} /> SNAP
            </button>
            <button
              className={`hud-btn flex items-center gap-1 ${torchOn ? 'active' : ''}`}
              onClick={handleTorch}
            >
              <ZapIcon size={9} /> {torchOn ? 'TORCH ON' : 'TORCH'}
            </button>
          </>
        )}

        <button
          className="hud-btn flex items-center gap-1 ml-auto"
          onClick={() => setFullscreen(true)}
          disabled={!streaming}
        >
          <Maximize2 size={9} />
        </button>
      </div>

      {/* Quality + Camera toggle */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>QUALITY:</span>
        {QUALITY_OPTIONS.map(q => (
          <button
            key={q.value}
            onClick={() => setQuality(q.value)}
            className={`hud-btn ${quality === q.value ? 'active' : ''}`}
            style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem' }}
          >
            {q.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {['rear', 'front'].map(cam => (
            <button
              key={cam}
              onClick={() => setCamera(cam)}
              className={`hud-btn ${camera === cam ? 'active' : ''}`}
              style={{ padding: '0.15rem 0.4rem', fontSize: '0.5rem' }}
            >
              {cam.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <WidgetCard id="camera" title="REMOTE CAMERA" icon={Camera}>
      {content}
    </WidgetCard>
  )
}
