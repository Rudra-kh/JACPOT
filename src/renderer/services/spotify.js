/**
 * Spotify service — PKCE OAuth flow + Web API calls
 */

const SPOTIFY_CLIENT_ID = '' // Set in Settings
const REDIRECT_URI = 'jarvis://spotify-callback'
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-modify',
  'user-library-read',
  'user-read-recently-played',
  'streaming',
].join(' ')

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function startSpotifyAuth(clientId) {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('spotify_verifier', verifier)
  const state = Math.random().toString(36).slice(2)
  sessionStorage.setItem('spotify_state', state)
  const url = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES,
  })}`
  window.api?.spotify.openAuth(url)
}

export async function exchangeCode(code, clientId) {
  const verifier = sessionStorage.getItem('spotify_verifier')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  })
  return res.json()
}

export async function refreshToken(refreshTok, clientId) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTok,
      client_id: clientId,
    }),
  })
  return res.json()
}

export async function spotifyFetch(path, token, opts = {}) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (res.status === 204) return null
  if (!res.ok) return null
  try { return await res.json() } catch { return null }
}

export async function getPlaybackState(token) {
  return spotifyFetch('/me/player', token)
}

export async function getRecentlyPlayed(token) {
  return spotifyFetch('/me/player/recently-played?limit=5', token)
}

export async function getQueue(token) {
  return spotifyFetch('/me/player/queue', token)
}

export async function getDevices(token) {
  return spotifyFetch('/me/player/devices', token)
}

export async function pausePlayback(token) {
  return spotifyFetch('/me/player/pause', token, { method: 'PUT' })
}

export async function resumePlayback(token) {
  return spotifyFetch('/me/player/play', token, { method: 'PUT' })
}

export async function skipNext(token) {
  return spotifyFetch('/me/player/next', token, { method: 'POST' })
}

export async function skipPrev(token) {
  return spotifyFetch('/me/player/previous', token, { method: 'POST' })
}

export async function setShuffle(token, state) {
  return spotifyFetch(`/me/player/shuffle?state=${state}`, token, { method: 'PUT' })
}

export async function setRepeat(token, state) {
  return spotifyFetch(`/me/player/repeat?state=${state}`, token, { method: 'PUT' })
}

export async function seekTo(token, positionMs) {
  return spotifyFetch(`/me/player/seek?position_ms=${Math.round(positionMs)}`, token, { method: 'PUT' })
}

export async function setVolume(token, pct) {
  return spotifyFetch(`/me/player/volume?volume_percent=${Math.round(pct)}`, token, { method: 'PUT' })
}

export async function saveTrack(token, id) {
  return spotifyFetch(`/me/tracks?ids=${id}`, token, { method: 'PUT' })
}

export async function removeTrack(token, id) {
  return spotifyFetch(`/me/tracks?ids=${id}`, token, { method: 'DELETE' })
}

export async function checkSaved(token, id) {
  const r = await spotifyFetch(`/me/tracks/contains?ids=${id}`, token)
  return r?.[0] ?? false
}

export function formatMs(ms) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
