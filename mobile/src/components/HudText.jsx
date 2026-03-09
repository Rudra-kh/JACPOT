import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { C } from '../theme'

export function HudLabel({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>
}

export function HudValue({ children, style, color }) {
  return <Text style={[styles.value, color ? { color } : null, style]}>{children}</Text>
}

export function HudMono({ children, style, size = 13 }) {
  return <Text style={[styles.mono, { fontSize: size }, style]}>{children}</Text>
}

const styles = StyleSheet.create({
  label: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: 'bold',
    color: C.text,
  },
  mono: {
    fontFamily: 'monospace',
    color: C.text,
  },
})
