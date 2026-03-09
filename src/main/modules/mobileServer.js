/**
 * JACPOTE — Mobile Bridge Server
 * Standalone HTTP + WebSocket server that the companion Android APK connects to.
 * Replaces KDE Connect entirely — no external apps required.
 *
 * Port: 5151
 * Protocol:
 *   • Phone → Laptop via WebSocket (JSON messages + binary JPEG frames)
 *   • File transfer via HTTP multipart (phone uploads) / HTTP download (laptop→phone)
 *   • Laptop → Phone via WebSocket JSON commands
 *   • MJPEG stream relay at GET /camera/stream (consumed by Electron renderer <img>)
 */

const express    = require('express')
const { WebSocketServer } = require('ws')
const http       = require('http')
const os         = require('os')
const path       = require('path')
const fs         = require('fs')
const multer     = require('multer')
const QRCode     = require('qrcode')
const crypto     = require('crypto')

const PORT = 5151

// One-time session token — regenerated each app launch.
// Encoded in the QR code so pairing is secure.
const sessionToken = crypto.randomBytes(16).toString('hex')

let mainWin        = null   // BrowserWindow reference (set on start)
let phoneSocket    = null   // Active phone WebSocket connection
let mjpegClients   = []     // Express Response streams waiting for camera frames

// ── Upload directory ───────────────────────────────────────────────────────────
const uploadDir = path.join(os.homedir(), 'Downloads', 'JACPOTE')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// ── Express ────────────────────────────────────────────────────────────────────
const expressApp = express()
expressApp.use(express.json({ limit: '10mb' }))
expressApp.use((_req, res, next) => {
  // Allow Electron renderer (file:// or localhost) to request /camera/stream
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (_req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Simple token auth middleware (skip for /pair)
function requireAuth(req, res, next) {
  if (req.headers.authorization === `Bearer ${sessionToken}`) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

// Pair info — phone fetches this first to get the token
expressApp.get('/pair', (_req, res) => {
  res.json({ name: os.hostname(), ip: getLocalIP(), port: PORT, token: sessionToken, version: '1.0' })
})

// Phone pushes battery / signal status
expressApp.post('/status', requireAuth, (req, res) => {
  mainWin?.webContents.send('mobile:status-update', req.body)
  res.json({ ok: true })
})

// Phone syncs SMS conversations
expressApp.post('/sms/sync', requireAuth, (req, res) => {
  mainWin?.webContents.send('mobile:sms-sync', req.body)
  res.json({ ok: true })
})

// ── File transfer ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
})
const upload = multer({ storage, limits: { fileSize: 512 * 1024 * 1024 } })

expressApp.post('/file', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file' })
  mainWin?.webContents.send('mobile:file-received', {
    filename: req.file.originalname,
    path:     req.file.path,
    size:     req.file.size,
  })
  res.json({ ok: true })
})

expressApp.get('/files', (_req, res) => {
  try {
    const files = fs.readdirSync(uploadDir)
      .filter(f => !f.startsWith('.'))
      .map(f => {
        const stat = fs.statSync(path.join(uploadDir, f))
        return { name: f, size: stat.size, ts: stat.mtimeMs }
      })
      .sort((a, b) => b.ts - a.ts)
    res.json(files)
  } catch { res.json([]) }
})

expressApp.get('/file/:filename', (req, res) => {
  // Prevent path traversal
  const safe = path.basename(req.params.filename)
  const full = path.join(uploadDir, safe)
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Not found' })
  res.download(full)
})

// ── MJPEG camera stream (consumed by RemoteCamera.jsx via <img src>) ───────────
expressApp.get('/camera/stream', (_req, res) => {
  res.writeHead(200, {
    'Content-Type':  'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
  })
  mjpegClients.push(res)
  _req.on('close', () => { mjpegClients = mjpegClients.filter(r => r !== res) })
})

function pushCameraFrame(frameBuffer) {
  if (!mjpegClients.length) return
  const hdr = Buffer.from(
    `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frameBuffer.length}\r\n\r\n`
  )
  const packet = Buffer.concat([hdr, frameBuffer, Buffer.from('\r\n')])
  for (const res of mjpegClients) {
    try { res.write(packet) } catch { /* client gone */ }
  }
}

// ── HTTP + WebSocket server ────────────────────────────────────────────────────
const server = http.createServer(expressApp)
const wss    = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  // First message must be the hello/auth handshake
  ws.once('message', (rawData) => {
    let msg
    try { msg = JSON.parse(rawData.toString()) } catch { ws.close(4002, 'Bad handshake'); return }

    if (msg.type !== 'hello' || msg.token !== sessionToken) {
      ws.close(4001, 'Unauthorized')
      return
    }

    // Authenticated — register as active phone
    if (phoneSocket && phoneSocket.readyState === 1) {
      phoneSocket.close(1000, 'Replaced by new connection')
    }
    phoneSocket = ws

    mainWin?.webContents.send('mobile:connected', {
      ip:      req.socket.remoteAddress,
      name:    msg.name    ?? 'Phone',
      battery: msg.battery ?? null,
    })

    ws.on('message', (payload, isBinary) => {
      if (isBinary) {
        // Raw JPEG camera frame — relay to MJPEG stream
        pushCameraFrame(Buffer.from(payload))
      } else {
        try { handlePhoneMessage(JSON.parse(payload.toString())) } catch { /* ignore */ }
      }
    })

    ws.on('close', () => {
      if (phoneSocket === ws) {
        phoneSocket = null
        mainWin?.webContents.send('mobile:disconnected')
      }
    })
  })
})

function handlePhoneMessage(msg) {
  switch (msg.type) {
    case 'status':       mainWin?.webContents.send('mobile:status-update', msg.data);    break
    case 'sms_sync':     mainWin?.webContents.send('mobile:sms-sync',      msg.data);    break
    case 'notification': mainWin?.webContents.send('mobile:notification',  msg.data);    break
    case 'clipboard':    mainWin?.webContents.send('mobile:clipboard',     msg.text);    break
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────
function sendToPhone(msg) {
  if (phoneSocket?.readyState === 1) { phoneSocket.send(JSON.stringify(msg)); return true }
  return false
}

function isPhoneConnected() {
  return phoneSocket?.readyState === 1
}

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
}

async function generateQR() {
  const payload = JSON.stringify({ ip: getLocalIP(), port: PORT, token: sessionToken })
  return QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', width: 280, margin: 1 })
}

function startMobileServer(win) {
  mainWin = win
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[MobileServer] Listening on ${getLocalIP()}:${PORT}`)
  })
  server.on('error', (err) => {
    console.error('[MobileServer] Error:', err.message)
  })
}

function stopMobileServer() {
  try { wss.close() } catch { /* ignore */ }
  try { server.close() } catch { /* ignore */ }
}

module.exports = { startMobileServer, stopMobileServer, sendToPhone, isPhoneConnected, generateQR, getLocalIP, PORT, uploadDir }
