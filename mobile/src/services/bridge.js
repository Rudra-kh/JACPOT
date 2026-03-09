/**
 * bridge.js — WebSocket connection service
 * Manages the persistent WebSocket link between this phone and the JACPOTE laptop server.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'jacpote_server'

let ws              = null
let serverInfo      = null   // { ip, port, token }
let reconnectTimer  = null
let listeners       = {}     // event → [callback, ...]

function emit(event, ...args) {
  ;(listeners[event] || []).forEach(cb => { try { cb(...args) } catch { /* ignore */ } })
}

export function on(event, cb) {
  if (!listeners[event]) listeners[event] = []
  listeners[event].push(cb)
  return () => { listeners[event] = listeners[event].filter(f => f !== cb) }
}

export function off(event, cb) {
  if (listeners[event]) listeners[event] = listeners[event].filter(f => f !== cb)
}

export function isConnected() {
  return ws?.readyState === 1  // WebSocket.OPEN
}

export function getServerInfo() {
  return serverInfo
}

export async function loadSavedServer() {
  try {
    const s = await AsyncStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export async function saveServer(info) {
  serverInfo = info
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(info))
}

export async function clearServer() {
  serverInfo = null
  await AsyncStorage.removeItem(STORAGE_KEY)
}

export function connect(info) {
  if (ws && ws.readyState !== 3 /* CLOSED */) {
    ws.close()
  }
  clearReconnect()
  serverInfo = info

  try {
    ws = new WebSocket(`ws://${info.ip}:${info.port}`)
  } catch (e) {
    emit('error', e)
    scheduleReconnect()
    return
  }

  ws.onopen = () => {
    // Send auth handshake
    ws.send(JSON.stringify({
      type:    'hello',
      token:   info.token,
      name:    'JACPOTE Phone',
      battery: null,  // will be updated shortly
    }))
    emit('connected')
  }

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      emit('command', msg)
      emit(`cmd:${msg.type}`, msg)
    } catch { /* binary or malformed */ }
  }

  ws.onclose = () => {
    emit('disconnected')
    scheduleReconnect()
  }

  ws.onerror = (e) => {
    emit('error', e)
  }
}

export function disconnect() {
  clearReconnect()
  if (ws) { ws.onclose = null; ws.close(); ws = null }
  emit('disconnected')
}

export function send(msg) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify(msg))
    return true
  }
  return false
}

export function sendBinary(data) {
  if (ws?.readyState === 1) {
    ws.send(data)
    return true
  }
  return false
}

function scheduleReconnect() {
  if (reconnectTimer || !serverInfo) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (serverInfo && !isConnected()) connect(serverInfo)
  }, 4000)
}

function clearReconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
}
