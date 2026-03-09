import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { C } from '../theme'

export default function ConnectionBadge({ connected }) {
  return (
    <View style={[styles.badge, connected ? styles.online : styles.offline]}>
      <View style={[styles.dot, connected ? styles.dotOnline : styles.dotOffline]} />
      <Text style={[styles.text, connected ? styles.textOnline : styles.textOffline]}>
        {connected ? 'CONNECTED' : 'OFFLINE'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
  },
  online:  { borderColor: 'rgba(0,255,136,0.3)', backgroundColor: 'rgba(0,255,136,0.06)' },
  offline: { borderColor: 'rgba(255,68,68,0.3)',  backgroundColor: 'rgba(255,68,68,0.06)' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOnline:  { backgroundColor: C.green },
  dotOffline: { backgroundColor: C.red },
  text: { fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, fontWeight: 'bold' },
  textOnline:  { color: C.green },
  textOffline: { color: C.red },
})
