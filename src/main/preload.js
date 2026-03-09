/**
 * JACPOTE — Preload Script
 * Exposes safe IPC bridge to renderer via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // System metrics
  system: {
    onMetrics: (cb) => {
      ipcRenderer.on('system:metrics', (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('system:metrics')
    },
  },

  // Spotify
  spotify: {
    openAuth: (url) => ipcRenderer.invoke('spotify:open-auth', url),
    onCallback: (cb) => {
      ipcRenderer.on('spotify:oauth-callback', (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('spotify:oauth-callback')
    },
  },

  // Mobile Bridge (standalone — no KDE Connect)
  mobile: {
    getStatus:     ()      => ipcRenderer.invoke('mobile:get-status'),
    ring:          ()      => ipcRenderer.invoke('mobile:ring'),
    sendFile:      (opts)  => ipcRenderer.invoke('mobile:send-file', opts),
    listDevices:   ()      => ipcRenderer.invoke('mobile:list-devices'),
    getQR:         ()      => ipcRenderer.invoke('mobile:get-qr'),
    getServerInfo: ()      => ipcRenderer.invoke('mobile:get-server-info'),
    sendCommand:   (cmd)   => ipcRenderer.invoke('mobile:send-command', cmd),
    onConnected:    (cb) => { ipcRenderer.on('mobile:connected',     (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('mobile:connected') },
    onDisconnected: (cb) => { ipcRenderer.on('mobile:disconnected',  ()      => cb());  return () => ipcRenderer.removeAllListeners('mobile:disconnected') },
    onStatus:       (cb) => { ipcRenderer.on('mobile:status-update', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('mobile:status-update') },
    onSmsSync:      (cb) => { ipcRenderer.on('mobile:sms-sync',      (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('mobile:sms-sync') },
    onFileReceived: (cb) => { ipcRenderer.on('mobile:file-received', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('mobile:file-received') },
    onNotification: (cb) => { ipcRenderer.on('mobile:notification',  (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('mobile:notification') },
  },

  // Clipboard
  clipboard: {
    getHistory: () => ipcRenderer.invoke('clipboard:get-history'),
    pin: (id, pinned) => ipcRenderer.invoke('clipboard:pin', id, pinned),
    delete: (id) => ipcRenderer.invoke('clipboard:delete', id),
    clearUnpinned: () => ipcRenderer.invoke('clipboard:clear-unpinned'),
    write: (text) => ipcRenderer.invoke('clipboard:write', text),
    tag: (id, tags) => ipcRenderer.invoke('clipboard:tag', id, tags),
    onNewEntry: (cb) => {
      ipcRenderer.on('clipboard:new-entry', (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('clipboard:new-entry')
    },
  },

  // Notes
  notes: {
    getAll: () => ipcRenderer.invoke('notes:get-all'),
    save: (note) => ipcRenderer.invoke('notes:save', note),
    delete: (id) => ipcRenderer.invoke('notes:delete', id),
    export: (id, fmt) => ipcRenderer.invoke('notes:export', id, fmt),
    openFloat: (id) => ipcRenderer.invoke('notes:open-float', id),
  },

  // SMS
  sms: {
    getConversations: () => ipcRenderer.invoke('sms:get-conversations'),
    getThread: (threadId) => ipcRenderer.invoke('sms:get-thread', threadId),
    markRead: (threadId) => ipcRenderer.invoke('sms:mark-read', threadId),
    send: (opts) => ipcRenderer.invoke('sms:send', opts),
  },

  // File Transfer
  transfers: {
    getHistory: () => ipcRenderer.invoke('transfers:get-history'),
    save: (t) => ipcRenderer.invoke('transfers:save', t),
    onProgress: (cb) => {
      ipcRenderer.on('transfer:progress', (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('transfer:progress')
    },
  },

  // Network / Hotspot
  network: {
    getStatus: () => ipcRenderer.invoke('network:get-status'),
    autoLogin: (opts) => ipcRenderer.invoke('hotspot:auto-login', opts),
    onStatus: (cb) => {
      ipcRenderer.on('network:status', (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('network:status')
    },
  },

  // Camera
  camera: {
    getUrl: (deviceId) => ipcRenderer.invoke('camera:get-url', deviceId),
    torch: (opts) => ipcRenderer.invoke('camera:torch', opts),
  },

  // Store (settings)
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
  },

  // App
  app: {
    setAutoLaunch: (enabled) => ipcRenderer.invoke('app:set-autolaunch', enabled),
  },

  // Mini Player controls (from main dashboard)
  miniPlayer: {
    show:          () => ipcRenderer.invoke('miniplayer:show'),
    hide:          () => ipcRenderer.invoke('miniplayer:hide'),
    resetPosition: () => ipcRenderer.invoke('miniplayer:resetPosition'),
  },

  // Global events from main
  on: (channel, cb) => {
    const allowed = ['global:command-palette', 'global:new-note', 'toast:show', 'clipboard:new-entry']
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_e, data) => cb(data))
      return () => ipcRenderer.removeAllListeners(channel)
    }
  },
})
