/**
 * HomeScreen — overview of connection status, phone metrics, and quick controls.
 * Pushes battery + signal status to the laptop every 30 seconds.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, StatusBar, Vibration,
} from 'react-native'
import * as Battery from 'expo-battery'
import * as Network from 'expo-network'
import * as Haptics from 'expo-haptics'
import { Audio } from 'expo-av'
import { C, S } from '../theme'
import * as bridge from '../services/bridge'
import ConnectionBadge from '../components/ConnectionBadge'
import { HudLabel, HudValue, HudMono } from '../components/HudText'

function MetricCard({ label, value, unit, color }) {
  return (
    <View style={[S.card, { flex: 1 }]}>
      <HudLabel>{label}</HudLabel>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, gap: 3 }}>
        <Text style={[styles.metricValue, color ? { color } : null]}>{value ?? '—'}</Text>
        {unit && <Text style={styles.metricUnit}>{unit}</Text>}
      </View>
    </View>
  )
}

export default function HomeScreen({ navigation }) {
  const [connected, setConnected]     = useState(bridge.isConnected())
  const [deviceName, setDeviceName]   = useState('JACPOTE Phone')
  const [battery, setBattery]         = useState(null)
  const [charging, setCharging]       = useState(false)
  const [ip, setIp]                   = useState(null)
  const soundRef = useRef(null)

  // --- Push status to laptop every 30s ---
  const pushStatus = useCallback(async () => {
    if (!bridge.isConnected()) return
    try {
      const [batt, net] = await Promise.all([
        Battery.getBatteryLevelAsync().catch(() => null),
        Network.getNetworkStateAsync().catch(() => null),
      ])
      const level = batt != null ? Math.round(batt * 100) : null
      bridge.send({
        type: 'status',
        data: {
          battery:  level,
          charging: charging,
          signal:   net?.isConnected ? 100 : 0,
          ip:       ip,
        },
      })
    } catch { /* ignore */ }
  }, [charging, ip])

  // Battery subscription
  useEffect(() => {
    Battery.getBatteryLevelAsync().then(l => setBattery(Math.round(l * 100)))
    Battery.getBatteryStateAsync().then(s => setCharging(s === Battery.BatteryState.CHARGING || s === Battery.BatteryState.FULL))

    const sub1 = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBattery(Math.round(batteryLevel * 100))
    })
    const sub2 = Battery.addBatteryStateListener(({ batteryState }) => {
      setCharging(batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL)
    })
    return () => { sub1.remove(); sub2.remove() }
  }, [])

  // Network
  useEffect(() => {
    Network.getIpAddressAsync().then(addr => setIp(addr)).catch(() => {})
  }, [])

  // Bridge connection events
  useEffect(() => {
    const u1 = bridge.on('connected',    () => setConnected(true))
    const u2 = bridge.on('disconnected', () => setConnected(false))

    // Handle ring command from laptop
    const u3 = bridge.on('cmd:ring', async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Vibration.vibrate([0, 400, 200, 400, 200, 400])
      try {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: 'https://www.soundjay.com/buttons/sounds/button-16.mp3' },
            { shouldPlay: true }
          )
          soundRef.current = sound
        } else {
          await soundRef.current.replayAsync()
        }
      } catch { /* no sound, vibration is enough */ }
    })

    // Handle lock screen command
    const u4 = bridge.on('cmd:lock_screen', () => {
      Alert.alert('JACPOTE', 'Lock screen command received from laptop.')
    })

    return () => { u1(); u2(); u3(); u4() }
  }, [])

  // Push status periodically
  useEffect(() => {
    pushStatus()
    const iv = setInterval(pushStatus, 30000)
    return () => clearInterval(iv)
  }, [pushStatus])

  // Also push immediately when battery changes
  useEffect(() => { pushStatus() }, [battery, charging])

  function handleDisconnect() {
    Alert.alert('Disconnect', 'Disconnect from laptop?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive', onPress: () => {
          bridge.disconnect()
          bridge.clearServer()
          navigation.replace('Pair')
        },
      },
    ])
  }

  const serverInfo = bridge.getServerInfo()

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>HUB STATUS</Text>
        <ConnectionBadge connected={connected} />
      </View>

      {/* Server info */}
      {serverInfo && (
        <View style={[S.card, styles.serverCard]}>
          <HudLabel>CONNECTED TO</HudLabel>
          <HudMono size={14} style={{ marginTop: 4, color: C.cyan }}>
            {serverInfo.ip}:{serverInfo.port}
          </HudMono>
        </View>
      )}

      {/* Metrics grid */}
      <View style={styles.grid}>
        <MetricCard
          label="BATTERY"
          value={battery}
          unit="%"
          color={battery == null ? C.dim : battery > 50 ? C.green : battery > 20 ? C.gold : C.red}
        />
        <MetricCard
          label="STATUS"
          value={charging ? 'CHRGNG' : 'DSCHRG'}
          color={charging ? C.green : C.text}
        />
      </View>

      <View style={styles.grid}>
        <MetricCard label="PHONE IP" value={ip || '—'} />
        <MetricCard label="WS LINK" value={connected ? 'LIVE' : 'DOWN'} color={connected ? C.green : C.red} />
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <HudLabel style={{ marginBottom: 10 }}>QUICK ACTIONS</HudLabel>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[S.btn, styles.actionBtn]}
            onPress={() => bridge.send({ type: 'clipboard', text: 'Hello from phone!' })}
          >
            <Text style={S.btnText}>SEND CLIP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.btn, styles.actionBtn]}
            onPress={pushStatus}
          >
            <Text style={S.btnText}>PUSH STATUS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Disconnect */}
      <TouchableOpacity
        style={[S.btn, S.btnDanger, styles.disconnectBtn]}
        onPress={handleDisconnect}
      >
        <Text style={[S.btnText, S.btnDangerText]}>UNPAIR DEVICE</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: C.text, letterSpacing: 2 },
  serverCard: { marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  section: { marginTop: 16 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
  metricValue: { fontFamily: 'monospace', fontSize: 22, fontWeight: 'bold', color: C.text },
  metricUnit:  { fontFamily: 'monospace', fontSize: 12, color: C.dim, paddingBottom: 3 },
  disconnectBtn: { marginTop: 24 },
})
