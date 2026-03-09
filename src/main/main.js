/**
 * JACPOTE — Electron Main Process
 * Handles: window management, IPC, system polling, KDE Connect, clipboard, SQLite, Spotify OAuth
 */

const { app, BrowserWindow, ipcMain, globalShortcut, protocol, clipboard, Notification, shell, screen, Menu } = require('electron')
const path = require('path')
const { exec } = require('child_process')
const os = require('os')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'

// ──────────────────────────────────────────
// Store module (handles encryption at rest)
// ──────────────────────────────────────────
let store
async function getStore() {
  if (!store) {
    const { default: Store } = await import('electron-store')
    store = new Store({
      name: 'jacpote-config',
      encryptionKey: require('crypto').createHash('sha256').update(require('os').hostname() + require('os').userInfo().username).digest('hex'),
    })
  }
  return store
}

let mainWindow = null
let clipboardWindow = null
let notesWindow = null

// ──────────────────────────────────────────
// Window creation
// ──────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    transparent: false,
    backgroundColor: '#020c18',
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
  return mainWindow
}

function createClipboardOverlay() {
  if (clipboardWindow) { clipboardWindow.show(); clipboardWindow.focus(); return }
  clipboardWindow = new BrowserWindow({
    width: 480,
    height: 640,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  const url = isDev ? 'http://localhost:5174/#/clipboard-overlay' : `file://${path.join(__dirname, '../../dist/index.html')}#/clipboard-overlay`
  clipboardWindow.loadURL(url)
  clipboardWindow.on('blur', () => clipboardWindow?.hide())
  clipboardWindow.on('closed', () => { clipboardWindow = null })
}

function createNotesOverlay() {
  const win = new BrowserWindow({
    width: 480,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  const url = isDev ? 'http://localhost:5174/#/notes-overlay' : `file://${path.join(__dirname, '../../dist/index.html')}#/notes-overlay`
  win.loadURL(url)
  win.on('closed', () => {})
  return win
}

// ──────────────────────────────────────────
// App boot
// ──────────────────────────────────────────
app.whenReady().then(async () => {
  // Register custom protocol for Spotify OAuth
  protocol.registerHttpProtocol('jarvis', (request) => {
    const url = new URL(request.url)
    if (url.pathname.includes('spotify-callback')) {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      mainWindow?.webContents.send('spotify:oauth-callback', { code, state })
    }
  })

  createMainWindow()

  // Global shortcuts
  globalShortcut.register('CommandOrControl+Space', () => {
    mainWindow?.webContents.send('global:command-palette')
    mainWindow?.show()
    mainWindow?.focus()
  })
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    createClipboardOverlay()
  })
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    mainWindow?.webContents.send('global:new-note')
    mainWindow?.show()
    mainWindow?.focus()
  })

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (!miniPlayer) { createMiniPlayer() }
    else if (miniPlayer.isVisible()) miniPlayer.hide()
    else miniPlayer.show()
  })

  // Start all background modules
  await startSystemMetricsPolling()
  startClipboardMonitor()
  startNetworkMonitor()

  app.on('activate', () => { if (!mainWindow) createMainWindow() })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopAllPolling()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ──────────────────────────────────────────
// Module: System Metrics (systeminformation)
// ──────────────────────────────────────────
const si = require('systeminformation')
let metricsInterval = null
const cpuHistory = Array(30).fill(0)
const ramHistory = Array(30).fill(0)
let lastNet = null

// ── WMI temperature: battery temp (Lenovo) + ACPI thermal zone fallback ──
let cachedCpuTemp = null
let cachedBattTemp = null
let tempWmiScript = null
function pollTempWmi() {
  if (!tempWmiScript) {
    tempWmiScript = path.join(os.tmpdir(), 'jacpote_temp.ps1')
    fs.writeFileSync(
      tempWmiScript,
      // 1) Try Lenovo_BatteryInformation (needs WMI access, works elevated)
// Output: BATT:<celsius>
// 2) Fallback: MSAcpi_ThermalZoneTemperature (decikelvin / 10 - 273.2)
// Output: CPU:<celsius>
// On failure writes nothing
"$out = ''\r\n" +
"try {\r\n" +
"  $b = Get-CimInstance -Namespace root\\WMI -ClassName Lenovo_BatteryInformation -ErrorAction Stop\r\n" +
"  if ($b -and $b.Temperature -gt 0) { $out += \"BATT:$($b.Temperature)\\n\" }\r\n" +
"} catch {}\r\n" +
"try {\r\n" +
"  $z = Get-CimInstance -Namespace root\\WMI -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop\r\n" +
"  $c = [math]::Round(($z | Sort-Object CurrentTemperature -Descending | Select-Object -First 1).CurrentTemperature / 10 - 273.2, 1)\r\n" +
"  if ($c -gt 0) { $out += \"CPU:$c\\n\" }\r\n" +
"} catch {}\r\n" +
"Write-Output $out",
      'utf8'
    )
  }
  exec(
    `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tempWmiScript}"`,
    { timeout: 5000 },
    (err, out) => {
      if (err) return
      for (const line of out.split(/\r?\n/)) {
        if (line.startsWith('BATT:')) {
          const v = parseFloat(line.slice(5))
          if (!isNaN(v) && v > 0) cachedBattTemp = v
        } else if (line.startsWith('CPU:')) {
          const v = parseFloat(line.slice(4))
          if (!isNaN(v) && v > 0) cachedCpuTemp = v
        }
      }
    }
  )
}

// ── WMI GPU utilisation (Intel Arc / AMD without NVML) ──
let cachedGpuPct = null
let gpuWmiScript = null
function pollGpuWmi() {
  if (!gpuWmiScript) {
    gpuWmiScript = path.join(os.tmpdir(), 'jacpote_gpu.ps1')
    fs.writeFileSync(
      gpuWmiScript,
      "$v=(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine|" +
      "Where-Object Name -match 'engtype_3D'|" +
      "Measure-Object -Property UtilizationPercentage -Sum).Sum\r\n" +
      "if($null -ne $v){Write-Output $v}else{Write-Output 0}",
      'utf8'
    )
  }
  exec(
    `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${gpuWmiScript}"`,
    { timeout: 4000 },
    (err, out) => {
      if (!err) {
        const v = parseInt(out.trim(), 10)
        if (!isNaN(v)) cachedGpuPct = Math.min(100, v)
      }
    }
  )
}

async function pollSystemMetrics() {
  try {
    const [cpu, mem, gpuData, disk, fsStats, net, temp, processes, time, batt, cpuSpeed] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.graphics(),
      si.fsSize(),
      si.disksIO(),
      si.networkStats(),
      si.cpuTemperature().catch(() => ({ main: null })),
      si.processes(),
      si.time(),
      si.battery().catch(() => ({ hasBattery: false, percent: null, isCharging: false })),
      si.cpuCurrentSpeed().catch(() => ({ avg: null })),
    ])

    const cpuUsage = cpu.currentLoad || 0
    cpuHistory.push(cpuUsage); cpuHistory.shift()
    const ramUsed = mem.used / (1024 ** 3)
    const ramTotal = mem.total / (1024 ** 3)
    const ramPct = (mem.used / mem.total) * 100
    ramHistory.push(ramPct); ramHistory.shift()

    // GPU
    const gpu = gpuData.controllers?.[0]
    const gpuUsage = gpu?.utilizationGpu ?? null
    const vramUsed = gpu?.memoryUsed ? gpu.memoryUsed / 1024 : null
    const vramTotal = gpu?.memoryTotal ? gpu.memoryTotal / 1024 : null

    // Network
    const netIface = net?.[0]
    let upSpeed = 0; let downSpeed = 0
    if (netIface && lastNet) {
      const dt = (netIface.ms || 2000) / 1000
      upSpeed = Math.max(0, (netIface.tx_bytes - lastNet.tx) / dt / 1024)
      downSpeed = Math.max(0, (netIface.rx_bytes - lastNet.rx) / dt / 1024)
    }
    if (netIface) lastNet = { tx: netIface.tx_bytes, rx: netIface.rx_bytes }

    // Uptime
    const upt = time.uptime
    const days = Math.floor(upt / 86400)
    const hours = Math.floor((upt % 86400) / 3600)
    const mins = Math.floor((upt % 3600) / 60)
    const uptime = `${days}d ${String(hours).padStart(2,'0')}h ${String(mins).padStart(2,'0')}m`

    const payload = {
      cpu: {
        usage: cpuUsage,
        temp: temp.main ?? cachedCpuTemp,
        ghz: cpuSpeed?.avg ?? null,
        cores: cpu.cpus?.map(c => c.load) ?? [],
        history: [...cpuHistory],
      },
      ram: {
        used: ramUsed,
        total: ramTotal,
        percent: ramPct,
        history: [...ramHistory],
      },
      gpu: { usage: cachedGpuPct ?? gpuUsage, vramUsed, vramTotal },
      battTemp: cachedBattTemp,
      disk: {
        drives: disk.map(d => ({
          mount: d.mount,
          size: d.size / (1024 ** 3),
          used: d.used / (1024 ** 3),
          percent: d.use,
          fs: d.fs,
        })),
        io: { read: (fsStats?.rIO_sec ?? 0) / (1024 ** 2), write: (fsStats?.wIO_sec ?? 0) / (1024 ** 2) },
      },
      network: { up: upSpeed, down: downSpeed },
      battery: { hasBattery: !!batt?.hasBattery, percent: batt?.percent ?? null, isCharging: !!batt?.isCharging },
      uptime,
      processes: processes.all,
    }

    mainWindow?.webContents.send('system:metrics', payload)
  } catch (err) {
    // Silent fail — metrics unavailable
  }
}

function startSystemMetricsPolling() {
  pollSystemMetrics()
  pollGpuWmi()
  pollTempWmi()
  metricsInterval = setInterval(pollSystemMetrics, 2000)
  setInterval(pollGpuWmi, 3000)
  setInterval(pollTempWmi, 5000)
}

// ──────────────────────────────────────────
// Module: Clipboard Monitor
// ──────────────────────────────────────────
let lastClipText = ''
let lastClipImage = null
let clipInterval = null

function startClipboardMonitor() {
  clipInterval = setInterval(() => {
    try {
      const text = clipboard.readText()
      const img = clipboard.readImage()
      const imgData = img.isEmpty() ? null : img.toDataURL()

      if (text && text !== lastClipText) {
        lastClipText = text
        saveClipEntry({ type: 'text', content: text })
        mainWindow?.webContents.send('clipboard:new-entry', { type: 'text', content: text, ts: Date.now() })
      } else if (imgData && imgData !== lastClipImage) {
        lastClipImage = imgData
        saveClipEntry({ type: 'image', content: imgData })
        mainWindow?.webContents.send('clipboard:new-entry', { type: 'image', content: imgData, ts: Date.now() })
      }
    } catch {}
  }, 500)
}

// ──────────────────────────────────────────
// Module: Network Monitor
// ──────────────────────────────────────────
let netInterval = null
async function startNetworkMonitor() {
  async function checkNet() {
    try {
      const ifaces = require('os').networkInterfaces()
      const net = await si.networkInterfaces()
      const gateway = await si.networkGatewayDefault()
      mainWindow?.webContents.send('network:status', {
        interfaces: net,
        gateway,
        ifaces: Object.entries(ifaces).map(([name, addrs]) => ({ name, addrs })),
      })
    } catch {}
  }
  checkNet()
  netInterval = setInterval(checkNet, 5000)
}

function stopAllPolling() {
  if (metricsInterval) clearInterval(metricsInterval)
  if (clipInterval) clearInterval(clipInterval)
  if (netInterval) clearInterval(netInterval)
  if (mpSpotifyInterval) clearInterval(mpSpotifyInterval)
}

// ──────────────────────────────────────────
// Module: SQLite Database
// ──────────────────────────────────────────
let db = null
function getDB() {
  if (db) return db
  try {
    const Database = require('better-sqlite3')
    const dbPath = path.join(app.getPath('userData'), 'jacpote.db')
    db = new Database(dbPath)
    initDB(db)
    return db
  } catch (e) {
    console.error('SQLite unavailable:', e.message)
    return null
  }
}

function initDB(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clipboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      source_app TEXT,
      pinned INTEGER DEFAULT 0,
      tags TEXT DEFAULT '',
      ts INTEGER NOT NULL,
      masked INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      body TEXT NOT NULL DEFAULT '',
      color TEXT DEFAULT 'cyan',
      pinned INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sms_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      contact_name TEXT,
      contact_number TEXT NOT NULL,
      body TEXT NOT NULL,
      direction TEXT NOT NULL,
      ts INTEGER NOT NULL,
      read INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      size INTEGER,
      direction TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      ts INTEGER NOT NULL
    );
  `)
}

function saveClipEntry({ type, content }) {
  try {
    const database = getDB()
    if (!database) return
    // Keep only 200 entries
    const ts = Date.now()
    const masked = /password|passwd|secret|token|key/i.test(content) ? 1 : 0
    database.prepare('INSERT INTO clipboard (type, content, ts, masked) VALUES (?,?,?,?)').run(type, content, ts, masked)
    const count = database.prepare('SELECT COUNT(*) as c FROM clipboard WHERE pinned=0').get()?.c
    if (count > 200) {
      database.prepare('DELETE FROM clipboard WHERE id IN (SELECT id FROM clipboard WHERE pinned=0 ORDER BY ts ASC LIMIT ?)').run(count - 200)
    }
  } catch {}
}

// ──────────────────────────────────────────
// IPC Handlers
// ──────────────────────────────────────────

// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.handle('window:close', () => mainWindow?.close())

// Clipboard
ipcMain.handle('clipboard:get-history', () => {
  const db = getDB(); if (!db) return []
  return db.prepare('SELECT * FROM clipboard ORDER BY pinned DESC, ts DESC LIMIT 200').all()
})
ipcMain.handle('clipboard:pin', (_, id, pinned) => {
  const db = getDB(); if (!db) return
  db.prepare('UPDATE clipboard SET pinned=? WHERE id=?').run(pinned ? 1 : 0, id)
})
ipcMain.handle('clipboard:delete', (_, id) => {
  const db = getDB(); if (!db) return
  db.prepare('DELETE FROM clipboard WHERE id=?').run(id)
})
ipcMain.handle('clipboard:clear-unpinned', () => {
  const db = getDB(); if (!db) return
  db.prepare('DELETE FROM clipboard WHERE pinned=0').run()
})
ipcMain.handle('clipboard:write', (_, text) => {
  clipboard.writeText(text)
  lastClipText = text
})
ipcMain.handle('clipboard:tag', (_, id, tags) => {
  const db = getDB(); if (!db) return
  db.prepare('UPDATE clipboard SET tags=? WHERE id=?').run(tags, id)
})

// Notes
ipcMain.handle('notes:get-all', () => {
  const db = getDB(); if (!db) return []
  return db.prepare('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC').all()
})
ipcMain.handle('notes:save', (_, note) => {
  const db = getDB(); if (!db) return null
  const now = Date.now()
  if (note.id) {
    db.prepare('UPDATE notes SET title=?, body=?, color=?, pinned=?, archived=?, updated_at=? WHERE id=?')
      .run(note.title, note.body, note.color, note.pinned ? 1 : 0, note.archived ? 1 : 0, now, note.id)
    return note.id
  } else {
    const r = db.prepare('INSERT INTO notes (title, body, color, pinned, archived, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(note.title || '', note.body || '', note.color || 'cyan', 0, 0, now, now)
    return r.lastInsertRowid
  }
})
ipcMain.handle('notes:delete', (_, id) => {
  const db = getDB(); if (!db) return
  db.prepare('DELETE FROM notes WHERE id=?').run(id)
})
ipcMain.handle('notes:export', async (_, id, format) => {
  const db = getDB(); if (!db) return
  const note = db.prepare('SELECT * FROM notes WHERE id=?').get(id)
  if (!note) return
  const { dialog } = require('electron')
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${note.title || 'note'}.${format}`,
    filters: [{ name: format === 'md' ? 'Markdown' : 'Text', extensions: [format] }],
  })
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, note.body)
  }
})
ipcMain.handle('notes:open-float', (_, id) => {
  createNotesOverlay()
})

// SMS
ipcMain.handle('sms:get-conversations', () => {
  const db = getDB(); if (!db) return []
  return db.prepare(`
    SELECT thread_id, contact_name, contact_number,
      MAX(ts) as last_ts,
      (SELECT body FROM sms_cache s2 WHERE s2.thread_id=s.thread_id ORDER BY ts DESC LIMIT 1) as last_msg,
      SUM(CASE WHEN read=0 AND direction='in' THEN 1 ELSE 0 END) as unread
    FROM sms_cache s GROUP BY thread_id ORDER BY last_ts DESC
  `).all()
})
ipcMain.handle('sms:get-thread', (_, threadId) => {
  const db = getDB(); if (!db) return []
  return db.prepare('SELECT * FROM sms_cache WHERE thread_id=? ORDER BY ts ASC').all(threadId)
})
ipcMain.handle('sms:mark-read', (_, threadId) => {
  const db = getDB(); if (!db) return
  db.prepare("UPDATE sms_cache SET read=1 WHERE thread_id=?").run(threadId)
})
ipcMain.handle('sms:send', async (_, { number, message, deviceId }) => {
  return new Promise((resolve) => {
    exec(`kdeconnect-cli --send-sms "${message}" --destination "${number}" --device "${deviceId}"`, (err) => {
      resolve({ ok: !err, error: err?.message })
    })
  })
})

// KDE Connect
ipcMain.handle('mobile:get-status', async (_, deviceId) => {
  return new Promise((resolve) => {
    exec('kdeconnect-cli -l --id-only', (err, stdout) => {
      if (err) return resolve({ connected: false, error: err.message })
      const ids = stdout.trim().split('\n').filter(Boolean)
      if (!ids.length) return resolve({ connected: false })
      const id = deviceId || ids[0]
      exec(`kdeconnect-cli -d "${id}" --follow-property battery`, (e, out) => {
        const battMatch = out?.match(/(\d+)%/)
        const batt = battMatch ? parseInt(battMatch[1]) : null
        resolve({ connected: true, deviceId: id, battery: batt })
      })
    })
  })
})
ipcMain.handle('mobile:ring', (_, deviceId) => {
  exec(`kdeconnect-cli -d "${deviceId}" --ring`)
  return { ok: true }
})
ipcMain.handle('mobile:send-file', async (_, { deviceId, filePath }) => {
  return new Promise((resolve) => {
    exec(`kdeconnect-cli --share "${filePath}" --device "${deviceId}"`, (err) => {
      resolve({ ok: !err, error: err?.message })
    })
  })
})
ipcMain.handle('mobile:list-devices', () => {
  return new Promise((resolve) => {
    exec('kdeconnect-cli -l', (err, stdout) => {
      if (err) return resolve([])
      const lines = stdout.split('\n').filter(l => l.includes(':'))
      resolve(lines.map(l => ({ raw: l.trim() })))
    })
  })
})

// Transfers
ipcMain.handle('transfers:get-history', () => {
  const db = getDB(); if (!db) return []
  return db.prepare('SELECT * FROM transfers ORDER BY ts DESC LIMIT 20').all()
})
ipcMain.handle('transfers:save', (_, t) => {
  const db = getDB(); if (!db) return
  db.prepare('INSERT INTO transfers (filename, size, direction, status, ts) VALUES (?,?,?,?,?)').run(t.filename, t.size, t.direction, t.status, t.ts ?? Date.now())
})

// Network / Hotspot
ipcMain.handle('network:get-status', async () => {
  const ifaces = os.networkInterfaces()
  return Object.entries(ifaces).map(([name, addrs]) => ({ name, addrs }))
})
ipcMain.handle('hotspot:auto-login', async (_, { url, username, password }) => {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { javascript: true }
    })
    win.loadURL(url).then(() => {
      win.webContents.executeJavaScript(`
        (function() {
          const u = document.querySelector('input[type=text], input[name*=user], input[name*=email], input[id*=user]');
          const p = document.querySelector('input[type=password]');
          if (u) u.value = ${JSON.stringify(username)};
          if (p) p.value = ${JSON.stringify(password)};
          const btn = document.querySelector('button[type=submit], input[type=submit]');
          if (btn) btn.click();
          return !!btn;
        })()
      `).then(ok => { win.close(); resolve({ ok }) })
    }).catch(err => { win.close(); resolve({ ok: false, error: err.message }) })
  })
})

// Store (settings)
ipcMain.handle('store:get', async (_, key) => {
  const s = await getStore(); return s.get(key)
})
ipcMain.handle('store:set', async (_, key, value) => {
  const s = await getStore(); s.set(key, value)
})
ipcMain.handle('store:delete', async (_, key) => {
  const s = await getStore(); s.delete(key)
})

// Spotify
ipcMain.handle('spotify:open-auth', (_, url) => {
  shell.openExternal(url)
})

// Camera
ipcMain.handle('camera:get-url', async (_, deviceId) => {
  // IP Webcam default port 8080; phone IP from KDE Connect or stored
  const s = await getStore()
  const phoneIp = s.get('mobile.phoneIp')
  if (!phoneIp) return null
  return `http://${phoneIp}:8080/video`
})
ipcMain.handle('camera:torch', async (_, { on }) => {
  const s = await getStore()
  const phoneIp = s.get('mobile.phoneIp')
  if (!phoneIp) return { ok: false }
  const endpoint = on ? 'enabletorch' : 'disabletorch'
  // Fire and forget
  require('https') // ensure module is loaded
  const http = require('http')
  http.get(`http://${phoneIp}:8080/${endpoint}`, () => {}).on('error', () => {})
  return { ok: true }
})

// Auto-launch
ipcMain.handle('app:set-autolaunch', async (_, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled })
})

// Toast from main to renderer helper
function sendToast(title, message, type = 'info') {
  mainWindow?.webContents.send('toast:show', { title, message, type })
}

// ──────────────────────────────────────────
// Module: Spotify Mini Player
// ──────────────────────────────────────────
let miniPlayer = null
let mpSpotifyInterval = null
let mpLastTrackId = null
let mpCachedState = null
let mpLyricsCache = {}
let mpPosMoveTimer = null

const MP_SIZES = { nano: [280, 50], standard: [380, 100], expanded: [380, 220] }

async function createMiniPlayer() {
  if (miniPlayer && !miniPlayer.isDestroyed()) { miniPlayer.show(); miniPlayer.focus(); return }

  const s = await getStore()
  const savedPos  = s.get('miniPlayer.position')
  const savedMode = s.get('miniPlayer.sizeMode') || 'standard'
  const savedOpacity = s.get('miniPlayer.opacity') || 1
  const [w, h] = MP_SIZES[savedMode] || MP_SIZES.standard

  // Clamp to screen bounds
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  let x = savedPos?.x ?? (sw - 400)
  let y = savedPos?.y ?? (sh - 160)
  x = Math.max(0, Math.min(x, sw - w))
  y = Math.max(0, Math.min(y, sh - h))

  miniPlayer = new BrowserWindow({
    width: w, height: h, x, y,
    minWidth: 280, minHeight: 50,
    maxWidth: 380, maxHeight: 220,
    frame: false, transparent: true,
    alwaysOnTop: true, resizable: false,
    skipTaskbar: true, hasShadow: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload-miniplayer.js'),
    },
  })

  if (isDev) {
    miniPlayer.loadURL('http://localhost:5174/miniplayer.html')
  } else {
    miniPlayer.loadFile(path.join(__dirname, '../../dist/miniplayer.html'))
  }

  if (savedOpacity < 1) miniPlayer.setOpacity(savedOpacity)

  miniPlayer.on('moved', async () => {
    clearTimeout(mpPosMoveTimer)
    mpPosMoveTimer = setTimeout(async () => {
      if (!miniPlayer || miniPlayer.isDestroyed()) return
      const [mx, my] = miniPlayer.getPosition()
      const st = await getStore()
      st.set('miniPlayer.position', { x: mx, y: my })
    }, 500)
  })

  miniPlayer.webContents.once('did-finish-load', () => {
    miniPlayer?.webContents.send('miniplayer:sizeMode', savedMode)
  })

  miniPlayer.on('closed', () => {
    clearInterval(mpSpotifyInterval)
    mpSpotifyInterval = null
    miniPlayer = null
  })

  startMpSpotifyPolling()
}

function startMpSpotifyPolling() {
  if (mpSpotifyInterval) clearInterval(mpSpotifyInterval)
  pollSpotifyForMp()
  mpSpotifyInterval = setInterval(pollSpotifyForMp, 1000)
}

async function pollSpotifyForMp() {
  if (!miniPlayer || miniPlayer.isDestroyed()) {
    clearInterval(mpSpotifyInterval); mpSpotifyInterval = null; return
  }
  try {
    const s = await getStore()
    const token = s.get('spotify.token')
    if (!token) { miniPlayer?.webContents.send('spotify:disconnected'); return }

    const res = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 401) {
      const rt = s.get('spotify.refreshToken'), cid = s.get('spotify.clientId')
      if (rt && cid) {
        const nr = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt, client_id: cid }),
        }).then(r => r.json()).catch(() => null)
        if (nr?.access_token) s.set('spotify.token', nr.access_token)
      }
      return
    }

    if (res.status === 204 || !res.ok) {
      miniPlayer?.webContents.send('spotify:state-update', { isPlaying: false, trackName: 'STANDBY', artistName: '', albumArtUrl: null, progressMs: 0, durationMs: 0 })
      return
    }

    const data = await res.json()
    const track = data?.item
    if (!track) return

    // Next track (best-effort, don't fail main poll if this errors)
    let nextTrack = null
    try {
      const qr = await fetch('https://api.spotify.com/v1/me/player/queue', { headers: { Authorization: `Bearer ${token}` } })
      if (qr.ok) { const qd = await qr.json(); const nxt = qd?.queue?.[0]; if (nxt) nextTrack = { name: nxt.name, artist: nxt.artists?.[0]?.name || '' } }
    } catch {}

    const newState = {
      isPlaying: data.is_playing,
      trackName: track.name,
      artistName: track.artists?.map(a => a.name).join(', ') || '',
      albumName: track.album?.name || '',
      albumArtUrl: track.album?.images?.[0]?.url || null,
      progressMs: data.progress_ms || 0,
      durationMs: track.duration_ms || 0,
      volume: data.device?.volume_percent ?? 50,
      isShuffle: data.shuffle_state || false,
      repeatMode: data.repeat_state || 'off',
      trackId: track.id,
      nextTrack,
    }

    miniPlayer?.webContents.send('spotify:state-update', newState)

    if (track.id !== mpLastTrackId) {
      const prev = mpCachedState ? { name: mpCachedState.trackName, artist: mpCachedState.artistName } : null
      mpLastTrackId = track.id
      mpCachedState = newState

      // Color extraction
      let vibrantPalette = { dominantColor: '#00c8ff', glowColor: '#00c8ff99', backgroundWash: '#020c18' }
      if (newState.albumArtUrl) {
        try {
          const Vibrant = require('node-vibrant')
          const imgBuf = await fetch(newState.albumArtUrl).then(r => r.arrayBuffer()).then(buf => Buffer.from(buf))
          const palette = await Vibrant.from(imgBuf).getPalette()
          let dom = palette.Vibrant?.hex || palette.LightVibrant?.hex || palette.Muted?.hex || '#00c8ff'
          // Reject near-white colors
          const r = parseInt(dom.slice(1,3),16), g = parseInt(dom.slice(3,5),16), b = parseInt(dom.slice(5,7),16)
          const lum = (0.299*r + 0.587*g + 0.114*b) / 255
          if (lum > 0.88) dom = '#00c8ff'
          vibrantPalette = { dominantColor: dom, glowColor: dom + '99', backgroundWash: palette.DarkMuted?.hex || '#020c18', lightVariant: palette.LightVibrant?.hex || dom, darkVariant: palette.DarkVibrant?.hex || dom }
        } catch (e) { /* silent — keep default cyan */ }
      }

      miniPlayer?.webContents.send('spotify:track-changed', { previousTrack: prev, newTrack: { name: newState.trackName, artist: newState.artistName, albumArtUrl: newState.albumArtUrl }, vibrantPalette })
      fetchMpLyrics(track.id, track.name, track.artists?.[0]?.name || '')
    } else {
      mpCachedState = newState
    }
  } catch { /* silent */ }
}

async function fetchMpLyrics(trackId, trackName, artistName) {
  if (mpLyricsCache[trackId]) { miniPlayer?.webContents.send('miniplayer:lyricsFetched', { lines: mpLyricsCache[trackId] }); return }
  try {
    const s = await getStore()
    const apiKey = s.get('miniPlayer.musixmatchApiKey')
    if (!apiKey) return
    const enc = encodeURIComponent
    const sr = await fetch(`https://api.musixmatch.com/ws/1.1/track.search?q_track=${enc(trackName)}&q_artist=${enc(artistName)}&apikey=${apiKey}&f_has_lyrics=1&s_track_rating=asc`, { signal: AbortSignal.timeout(3000) })
    const sd = await sr.json()
    const mmId = sd?.message?.body?.track_list?.[0]?.track?.track_id
    if (!mmId) return
    const lr = await fetch(`https://api.musixmatch.com/ws/1.1/track.subtitle.get?track_id=${mmId}&subtitle_format=lrc&apikey=${apiKey}`, { signal: AbortSignal.timeout(3000) })
    const ld = await lr.json()
    const lrc = ld?.message?.body?.subtitle?.subtitle_body
    if (!lrc) return
    const lines = []
    for (const line of lrc.split('\n')) {
      const m = line.match(/\[(\d+):(\d+)\.(\d+)\]\s*(.*)/)
      if (m) { const ms = +m[1]*60000 + +m[2]*1000 + Math.round(+m[3]*10); const t = m[4].trim(); if (t) lines.push({ startMs: ms, text: t }) }
    }
    mpLyricsCache[trackId] = lines
    miniPlayer?.webContents.send('miniplayer:lyricsFetched', { lines })
  } catch { /* silent */ }
}

// ── Mini Player IPC ──────────────────────────────────────────
ipcMain.handle('miniplayer:setSize', async (_, mode) => {
  if (!miniPlayer || miniPlayer.isDestroyed()) return
  const [w, h] = MP_SIZES[mode] || MP_SIZES.standard
  miniPlayer.setSize(w, h)
  miniPlayer.webContents.send('miniplayer:sizeMode', mode)
  const st = await getStore()
  st.set('miniPlayer.sizeMode', mode)
})

ipcMain.handle('miniplayer:hide', () => miniPlayer?.hide())
ipcMain.handle('miniplayer:show', () => { if (!miniPlayer || miniPlayer.isDestroyed()) createMiniPlayer(); else miniPlayer.show() })
ipcMain.handle('miniplayer:resetPosition', async () => {
  if (!miniPlayer || miniPlayer.isDestroyed()) return
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  miniPlayer.setPosition(sw - 400, sh - 160)
  const st = await getStore(); st.set('miniPlayer.position', { x: sw - 400, y: sh - 160 })
})

ipcMain.handle('miniplayer:contextMenu', (event) => {
  if (!miniPlayer || miniPlayer.isDestroyed()) return
  const menu = Menu.buildFromTemplate([
    { label: '▶  Open Full Dashboard', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: '♡  Save to Liked Songs', click: async () => {
      const s = await getStore(); const token = s.get('spotify.token')
      if (token && mpCachedState?.trackId) await fetch(`https://api.spotify.com/v1/me/tracks?ids=${mpCachedState.trackId}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }},
    { label: '📋  Copy Track Info', click: () => { if (mpCachedState) clipboard.writeText(`${mpCachedState.trackName} — ${mpCachedState.artistName}`) } },
    { type: 'separator' },
    { label: 'Size Mode', submenu: [
      { label: 'Nano (280×50)',      type: 'radio', click: () => { miniPlayer?.setSize(280, 50);  miniPlayer?.webContents.send('miniplayer:sizeMode', 'nano') }},
      { label: 'Standard (380×100)', type: 'radio', click: () => { miniPlayer?.setSize(380, 100); miniPlayer?.webContents.send('miniplayer:sizeMode', 'standard') }},
      { label: 'Expanded (380×220)', type: 'radio', click: () => { miniPlayer?.setSize(380, 220); miniPlayer?.webContents.send('miniplayer:sizeMode', 'expanded') }},
    ]},
    { label: 'Opacity', submenu: [100, 85, 70, 50].map(v => ({
        label: `${v}%`, type: 'radio',
        click: async () => { miniPlayer?.setOpacity(v/100); const s = await getStore(); s.set('miniPlayer.opacity', v/100) },
    }))},
    { type: 'separator' },
    { label: 'Always on Top', type: 'checkbox', checked: miniPlayer?.isAlwaysOnTop() ?? true,
      click: (item) => miniPlayer?.setAlwaysOnTop(item.checked) },
    { type: 'separator' },
    { label: '✕  Close Mini Player', click: () => miniPlayer?.hide() },
  ])
  menu.popup({ window: miniPlayer })
})

ipcMain.handle('spotify:mp-command', async (_, payload) => {
  const s = await getStore(); const token = s.get('spotify.token')
  if (!token) return { ok: false }
  const { action, positionMs, volumePercent } = payload
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const BASE = 'https://api.spotify.com/v1/me/player'
  try {
    switch (action) {
      case 'play':          await fetch(`${BASE}/play`, { method: 'PUT', headers: h }); break
      case 'pause':         await fetch(`${BASE}/pause`, { method: 'PUT', headers: h }); break
      case 'next':          await fetch(`${BASE}/next`, { method: 'POST', headers: h }); break
      case 'previous':      await fetch(`${BASE}/previous`, { method: 'POST', headers: h }); break
      case 'seek':          await fetch(`${BASE}/seek?position_ms=${positionMs}`, { method: 'PUT', headers: h }); break
      case 'setVolume':     await fetch(`${BASE}/volume?volume_percent=${volumePercent}`, { method: 'PUT', headers: h }); break
      case 'toggleShuffle': await fetch(`${BASE}/shuffle?state=${!mpCachedState?.isShuffle}`, { method: 'PUT', headers: h }); break
      case 'toggleRepeat':  await fetch(`${BASE}/repeat?state=${mpCachedState?.repeatMode === 'off' ? 'context' : 'off'}`, { method: 'PUT', headers: h }); break
      case 'saveLiked':     if (mpCachedState?.trackId) await fetch(`https://api.spotify.com/v1/me/tracks?ids=${mpCachedState.trackId}`, { method: 'PUT', headers: h }); break
      case 'openMainDashboard': mainWindow?.show(); mainWindow?.focus(); break
      case 'closeMiniplayer':   miniPlayer?.hide(); break
    }
  } catch {}
  return { ok: true }
})
