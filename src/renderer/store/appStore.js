import { create } from 'zustand'

/**
 * Global Zustand store for JACPOTE
 * Manages layout state, theme, toasts, widget collapse, and command palette
 */

let toastId = 0

export const useAppStore = create((set, get) => ({
  // ── Boot ──
  booted: false,
  setBooted: () => set({ booted: true }),

  // ── Active view ──
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  // ── Popup panel (partial-screen overlay) ──
  activePanel: null,
  openPanel: (id) => set({ activePanel: id }),
  closePanel: () => set({ activePanel: null }),

  // ── Widget collapsed state ──
  collapsed: {},
  toggleCollapsed: (widget) =>
    set((s) => ({ collapsed: { ...s.collapsed, [widget]: !s.collapsed[widget] } })),

  // ── Toast notifications ──
  toasts: [],
  addToast: ({ title, message, type = 'info' }) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, title, message, type }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Command palette ──
  paletteOpen: false,
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),

  // ── Settings panel ──
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  // ── System metrics ──
  metrics: null,
  setMetrics: (m) => set({ metrics: m }),

  // ── Spotify state ──
  spotify: {
    playing: false,
    track: null,
    artist: null,
    album: null,
    albumArt: null,
    progress: 0,
    duration: 0,
    volume: 50,
    shuffle: false,
    repeat: 'off',
    queue: [],
    recentlyPlayed: [],
    devices: [],
    authenticated: false,
    token: null,
  },
  setSpotify: (patch) => set((s) => ({ spotify: { ...s.spotify, ...patch } })),

  // ── Mobile status ──
  mobile: {
    connected: false,
    deviceId: null,
    deviceName: null,
    battery: null,
    model: null,
  },
  setMobile: (patch) => set((s) => ({ mobile: { ...s.mobile, ...patch } })),

  // ── Network ──
  network: { ssid: null, ip: null, gateway: null },
  setNetwork: (patch) => set((s) => ({ network: { ...s.network, ...patch } })),

  // ── Theme ──
  theme: 'cyan',
  setTheme: (t) => set({ theme: t }),

  // ── Notes search ──
  notesSearch: '',
  setNotesSearch: (q) => set({ notesSearch: q }),

  // ── Clipboard search ──
  clipSearch: '',
  setClipSearch: (q) => set({ clipSearch: q }),

  // ── SMS active thread ──
  activeSmsThread: null,
  setActiveSmsThread: (id) => set({ activeSmsThread: id }),
}))
