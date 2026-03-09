/**
 * CameraScreen — streams phone camera to JACPOTE laptop via WebSocket (MJPEG relay).
 * Laptop displays it at http://localhost:5151/camera/stream in the RemoteCamera widget.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions, ActivityIndicator,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as bridge from '../services/bridge'
import { C, S } from '../theme'
import { HudLabel } from '../components/HudText'

const { width: SCREEN_W } = Dimensions.get('window')
const PREVIEW_H = SCREEN_W * (4 / 3)

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [streaming,  setStreaming]      = useState(false)
  const [facing,     setFacing]         = useState('back')
  const [torch,      setTorch]          = useState(false)
  const [fps,        setFps]            = useState(0)
  const [quality,    setQuality]        = useState(0.3)  // JPEG quality 0–1
  const cameraRef   = useRef(null)
  const streamingRef = useRef(false)
  const fpsCount    = useRef(0)

  // FPS counter
  useEffect(() => {
    const iv = setInterval(() => {
      setFps(fpsCount.current)
      fpsCount.current = 0
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  // Handle torch command from laptop
  useEffect(() => {
    const unsub = bridge.on('cmd:torch', (msg) => {
      setTorch(!!msg.on)
    })
    return () => unsub()
  }, [])

  const captureLoop = useCallback(async () => {
    if (!streamingRef.current || !cameraRef.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality,
        base64: false,
        skipProcessing: true,
        shutterSound: false,
      })
      // Fetch as blob and send as binary over WebSocket
      const res  = await fetch(photo.uri)
      const blob = await res.blob()
      const ok   = bridge.sendBinary(blob)
      if (ok) fpsCount.current++
    } catch { /* skip frame on error */ }

    if (streamingRef.current) {
      // Small delay to prevent lock-up; adjust for desired fps
      setTimeout(captureLoop, 80)  // ~12 fps max
    }
  }, [quality])

  function startStream() {
    if (!bridge.isConnected()) return
    streamingRef.current = true
    setStreaming(true)
    captureLoop()
  }

  function stopStream() {
    streamingRef.current = false
    setStreaming(false)
    setFps(0)
  }

  function toggleTorch() {
    const next = !torch
    setTorch(next)
    bridge.send({ type: 'torch', on: next })
  }

  if (!permission) return <View style={styles.bg} />
  if (!permission.granted) {
    return (
      <View style={[styles.bg, styles.center]}>
        <Text style={styles.permText}>Camera permission required.</Text>
        <TouchableOpacity style={[S.btn, { marginTop: 16 }]} onPress={requestPermission}>
          <Text style={S.btnText}>GRANT PERMISSION</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Camera preview */}
      <CameraView
        ref={cameraRef}
        style={{ width: SCREEN_W, height: PREVIEW_H }}
        facing={facing}
        enableTorch={torch}
      />

      {/* HUD overlay */}
      <View style={styles.overlay} pointerEvents="none">
        {streaming && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>STREAMING  {fps} fps</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          {/* Quality selector */}
          <View style={{ flex: 1 }}>
            <HudLabel style={{ marginBottom: 6 }}>QUALITY</HudLabel>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[['LO', 0.2], ['MED', 0.4], ['HI', 0.7]].map(([lbl, val]) => (
                <TouchableOpacity
                  key={lbl}
                  style={[styles.qBtn, quality === val && styles.qBtnActive]}
                  onPress={() => setQuality(val)}
                >
                  <Text style={[styles.qBtnText, quality === val && { color: C.cyan }]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Flip + Torch */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[S.btn, styles.iconBtn]}
              onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
            >
              <Text style={S.btnText}>FLIP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btn, styles.iconBtn, torch && S.btnActive]}
              onPress={toggleTorch}
            >
              <Text style={[S.btnText, torch && { color: C.gold }]}>TORCH</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stream toggle */}
        <TouchableOpacity
          style={[S.btn, styles.streamBtn, streaming && styles.streamBtnActive]}
          onPress={streaming ? stopStream : startStream}
          disabled={!bridge.isConnected()}
        >
          {streaming
            ? <Text style={[S.btnText, { color: C.red }]}>■  STOP STREAM</Text>
            : <Text style={S.btnText}>▶  START STREAM</Text>
          }
        </TouchableOpacity>

        {!bridge.isConnected() && (
          <Text style={styles.offlineText}>Connect to laptop first.</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  permText: { fontFamily: 'monospace', color: C.dim, fontSize: 13, textAlign: 'center' },

  overlay: { position: 'absolute', top: 12, left: 12, right: 12 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(2,12,24,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, alignSelf: 'flex-start' },
  liveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  liveText:  { fontFamily: 'monospace', fontSize: 10, color: C.red, letterSpacing: 1 },

  controls: { flex: 1, backgroundColor: C.bg, padding: 16, gap: 12 },
  controlRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },

  qBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg2 },
  qBtnActive:{ borderColor: C.cyan, backgroundColor: 'rgba(0,200,255,0.1)' },
  qBtnText:  { fontFamily: 'monospace', fontSize: 10, color: C.dim, letterSpacing: 1 },

  iconBtn:   { paddingHorizontal: 12 },
  streamBtn: { paddingVertical: 14 },
  streamBtnActive: { borderColor: 'rgba(255,68,68,0.4)', backgroundColor: 'rgba(255,68,68,0.06)' },
  offlineText: { fontFamily: 'monospace', fontSize: 10, color: C.red, textAlign: 'center' },
})
