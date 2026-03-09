/**
 * JACPOTE — Mini Player Preload
 * Exposes slim IPC bridge for the floating Spotify mini player window.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mpApi', {
  spotify: {
    onState: (cb) => {
      const handler = (_e, d) => cb(d)
      ipcRenderer.on('spotify:state-update', handler)
      return () => ipcRenderer.removeListener('spotify:state-update', handler)
    },
    onTrackChanged: (cb) => {
      const handler = (_e, d) => cb(d)
      ipcRenderer.on('spotify:track-changed', handler)
      return () => ipcRenderer.removeListener('spotify:track-changed', handler)
    },
    onDisconnected: (cb) => {
      const handler = () => cb()
      ipcRenderer.on('spotify:disconnected', handler)
      return () => ipcRenderer.removeListener('spotify:disconnected', handler)
    },
    command: (action, payload = {}) =>
      ipcRenderer.invoke('spotify:mp-command', { action, ...payload }),
  },

  miniPlayer: {
    setSize: (mode) => ipcRenderer.invoke('miniplayer:setSize', mode),
    hide: () => ipcRenderer.invoke('miniplayer:hide'),
    openContextMenu: () => ipcRenderer.invoke('miniplayer:contextMenu'),
    onSizeModeChanged: (cb) => {
      const handler = (_e, m) => cb(m)
      ipcRenderer.on('miniplayer:sizeMode', handler)
      return () => ipcRenderer.removeListener('miniplayer:sizeMode', handler)
    },
    onLyrics: (cb) => {
      const handler = (_e, d) => cb(d)
      ipcRenderer.on('miniplayer:lyricsFetched', handler)
      return () => ipcRenderer.removeListener('miniplayer:lyricsFetched', handler)
    },
  },

  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  },
})
