/**
 * PairScreen — enter laptop IP manually OR scan the QR code shown in the desktop app.
 * On successful pair, navigates to the main tab navigator.
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, StatusBar,
} from 'react-native'
import { BarCodeScanner } from 'expo-barcode-scanner'
import { C, S } from '../theme'
import * as bridge from '../services/bridge'

export default function PairScreen({ navigation }) {
  const [mode, setMode]           = useState('manual')  // 'manual' | 'qr'
  const [ip, setIp]               = useState('')
  const [port, setPort]           = useState('5151')
  const [token, setToken]         = useState('')
  const [connecting, setConnecting] = useState(false)
  const [hasCamPerm, setHasCamPerm] = useState(null)
  const connectedRef = useRef(false)

  // --- Request camera permission for QR scanner ---
  useEffect(() => {
    if (mode === 'qr') {
      BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
        setHasCamPerm(status === 'granted')
      })
    }
  }, [mode])

  // --- Try to auto-connect from saved credentials ---
  useEffect(() => {
    bridge.loadSavedServer().then(saved => {
      if (!saved) return
      setIp(saved.ip)
      setPort(String(saved.port))
      setToken(saved.token)
      attemptConnect(saved, false)
    })
  }, [])

  function attemptConnect(info, save = true) {
    setConnecting(true)
    connectedRef.current = false

    const unsub = bridge.on('connected', () => {
      connectedRef.current = true
      unsub()
      if (save) bridge.saveServer(info)
      setConnecting(false)
      navigation.replace('Main')
    })

    const unsubErr = bridge.on('disconnected', () => {
      if (!connectedRef.current) {
        unsub()
        unsubErr()
        setConnecting(false)
      }
    })

    bridge.connect(info)

    // Timeout after 6 seconds
    setTimeout(() => {
      if (!connectedRef.current) {
        bridge.disconnect()
        unsub()
        unsubErr()
        setConnecting(false)
        Alert.alert('Connection Failed', `Could not reach ${info.ip}:${info.port}.\n\nMake sure:\n• Laptop and phone are on the same Wi-Fi\n• JACPOTE desktop app is running`)
      }
    }, 6000)
  }

  function handleManualConnect() {
    const info = { ip: ip.trim(), port: parseInt(port) || 5151, token: token.trim() }
    if (!info.ip) return Alert.alert('Error', 'Enter the laptop IP address.')
    if (!info.token) return Alert.alert('Error', 'Enter the pairing token shown in JACPOTE.')
    attemptConnect(info)
  }

  function handleQRScanned({ data }) {
    try {
      const info = JSON.parse(data)
      if (!info.ip || !info.port || !info.token) throw new Error('Invalid QR')
      setMode('manual')
      setIp(info.ip)
      setPort(String(info.port))
      setToken(info.token)
      attemptConnect(info)
    } catch {
      Alert.alert('Invalid QR', 'This QR code is not from JACPOTE.')
    }
  }

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Logo / Title */}
      <View style={styles.header}>
        <Text style={styles.title}>JACPOTE</Text>
        <Text style={styles.subtitle}>MOBILE BRIDGE</Text>
        <View style={styles.divider} />
      </View>

      {/* Mode selector */}
      <View style={styles.tabs}>
        {['manual', 'qr'].map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, mode === m && styles.tabActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'manual' ? 'MANUAL' : 'SCAN QR'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'manual' ? (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>LAPTOP IP ADDRESS</Text>
          <TextInput
            style={styles.input}
            value={ip}
            onChangeText={setIp}
            placeholder="192.168.1.x"
            placeholderTextColor={C.dim}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>PORT</Text>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="5151"
            placeholderTextColor={C.dim}
            keyboardType="number-pad"
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>PAIRING TOKEN</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="Shown in JACPOTE › Mobile Hub › Show QR"
            placeholderTextColor={C.dim}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
          />

          <Text style={styles.hint}>
            In the JACPOTE desktop app, open Mobile Hub and tap "SHOW PAIRING QR" to get the token, or scan the QR code directly.
          </Text>

          <TouchableOpacity
            style={[S.btn, styles.connectBtn, connecting && { opacity: 0.6 }]}
            onPress={handleManualConnect}
            disabled={connecting}
          >
            {connecting
              ? <ActivityIndicator color={C.cyan} size="small" />
              : <Text style={[S.btnText, { fontSize: 13 }]}>CONNECT</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.qrContainer}>
          {hasCamPerm === null && (
            <ActivityIndicator color={C.cyan} size="large" style={{ marginTop: 40 }} />
          )}
          {hasCamPerm === false && (
            <Text style={styles.errText}>Camera permission denied. Enable it in Settings.</Text>
          )}
          {hasCamPerm === true && (
            <>
              <Text style={styles.qrHint}>Point camera at the QR code in JACPOTE › Mobile Hub</Text>
              <View style={styles.scannerWrap}>
                <BarCodeScanner
                  onBarCodeScanned={connecting ? undefined : handleQRScanned}
                  style={StyleSheet.absoluteFillObject}
                />
                {/* Corner overlays for HUD look */}
                {['tl','tr','bl','br'].map(c => (
                  <View key={c} style={[styles.corner, styles[c]]} />
                ))}
              </View>
              {connecting && (
                <View style={styles.connectingOverlay}>
                  <ActivityIndicator color={C.cyan} size="large" />
                  <Text style={styles.connectingText}>CONNECTING…</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  container: { padding: 24, paddingTop: 48 },
  header: { alignItems: 'center', marginBottom: 28 },
  title: { fontFamily: 'monospace', fontSize: 28, fontWeight: 'bold', color: C.cyan, letterSpacing: 4 },
  subtitle: { fontFamily: 'monospace', fontSize: 11, color: C.dim, letterSpacing: 3, marginTop: 4 },
  divider: { width: 60, height: 1, backgroundColor: C.border, marginTop: 16 },

  tabs: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1,
    borderColor: C.border, alignItems: 'center', backgroundColor: C.bg2,
  },
  tabActive: { borderColor: C.cyan, backgroundColor: 'rgba(0,200,255,0.1)' },
  tabText: { fontFamily: 'monospace', fontSize: 11, color: C.dim, letterSpacing: 1 },
  tabTextActive: { color: C.cyan },

  form: { gap: 4 },
  fieldLabel: { fontFamily: 'monospace', fontSize: 9, color: C.dim, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    backgroundColor: C.bg2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'monospace',
    fontSize: 13,
    color: C.text,
  },
  hint: { fontSize: 11, color: C.dim, fontFamily: 'monospace', lineHeight: 17, marginTop: 12, marginBottom: 4 },
  connectBtn: { marginTop: 20, paddingVertical: 14 },

  qrContainer: { alignItems: 'center', gap: 12 },
  qrHint: { fontFamily: 'monospace', fontSize: 11, color: C.dim, textAlign: 'center', marginBottom: 8 },
  scannerWrap: { width: 260, height: 260, overflow: 'hidden', borderRadius: 8, position: 'relative' },
  corner: {
    position: 'absolute', width: 20, height: 20,
    borderColor: C.cyan, borderWidth: 2,
  },
  tl: { top: 0,    left: 0,  borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0,    right: 0, borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0,  borderRightWidth: 0, borderTopWidth: 0,    borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0,  borderTopWidth: 0,    borderBottomRightRadius: 4 },
  connectingOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(2,12,24,0.8)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  connectingText: { fontFamily: 'monospace', fontSize: 12, color: C.cyan, letterSpacing: 2 },
  errText: { color: C.red, fontFamily: 'monospace', fontSize: 12, textAlign: 'center', marginTop: 24 },
})
