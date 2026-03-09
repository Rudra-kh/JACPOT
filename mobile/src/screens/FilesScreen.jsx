/**
 * FilesScreen — upload files from phone to laptop, download files from laptop.
 * Uses HTTP multipart upload (POST /file) and HTTP download (GET /file/:name).
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { C, S } from '../theme'
import * as bridge from '../services/bridge'
import { HudLabel, HudMono } from '../components/HudText'

function formatSize(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function relTime(ts) {
  const d = (Date.now() - ts) / 1000
  if (d < 60) return `${Math.floor(d)}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

export default function FilesScreen() {
  const [laptopFiles,  setLaptopFiles]  = useState([])
  const [uploads,      setUploads]      = useState([])   // { name, status, progress }
  const [loading,      setLoading]      = useState(false)
  const serverInfo = bridge.getServerInfo()

  const baseUrl = serverInfo ? `http://${serverInfo.ip}:${serverInfo.port}` : null

  const loadLaptopFiles = useCallback(async () => {
    if (!baseUrl) return
    setLoading(true)
    try {
      const res  = await fetch(`${baseUrl}/files`)
      const data = await res.json()
      setLaptopFiles(Array.isArray(data) ? data : [])
    } catch { /* offline */ }
    setLoading(false)
  }, [baseUrl])

  useEffect(() => {
    loadLaptopFiles()
    // Re-check when bridge reconnects
    const unsub = bridge.on('connected', loadLaptopFiles)
    return () => unsub()
  }, [loadLaptopFiles])

  // Handle download_file command from laptop
  useEffect(() => {
    const unsub = bridge.on('cmd:download_file', async (msg) => {
      if (!msg.url || !msg.filename) return
      const dest = FileSystem.documentDirectory + msg.filename
      try {
        const { uri } = await FileSystem.downloadAsync(msg.url, dest)
        const canShare = await Sharing.isAvailableAsync()
        if (canShare) await Sharing.shareAsync(uri)
      } catch (e) {
        Alert.alert('Download Failed', e.message)
      }
    })
    return () => unsub()
  }, [])

  async function pickAndUpload() {
    if (!baseUrl) {
      Alert.alert('Not Connected', 'Connect to laptop first.')
      return
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
      if (result.canceled) return

      const file = result.assets[0]
      const entry = { id: Date.now(), name: file.name, status: 'uploading', progress: 0, size: file.size }
      setUploads(prev => [entry, ...prev])

      const form = new FormData()
      form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' })

      const uploadRes = await FileSystem.uploadAsync(`${baseUrl}/file`, file.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: file.mimeType || 'application/octet-stream',
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
        headers: { 'Accept': 'application/json' },
      })

      const ok = uploadRes.status === 200
      setUploads(prev => prev.map(u => u.id === entry.id ? { ...u, status: ok ? 'done' : 'error' } : u))
      if (ok) { loadLaptopFiles() }
      else { Alert.alert('Upload Failed', `Status: ${uploadRes.status}`) }
    } catch (e) {
      Alert.alert('Error', e.message)
    }
  }

  async function downloadFile(filename) {
    if (!baseUrl) return
    const url  = `${baseUrl}/file/${encodeURIComponent(filename)}`
    const dest = FileSystem.documentDirectory + filename
    try {
      const { uri } = await FileSystem.downloadAsync(url, dest)
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) await Sharing.shareAsync(uri)
      else Alert.alert('Downloaded', `Saved to: ${uri}`)
    } catch (e) {
      Alert.alert('Download Failed', e.message)
    }
  }

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Upload section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <HudLabel>PHONE → LAPTOP</HudLabel>
          <TouchableOpacity style={[S.btn, styles.smallBtn]} onPress={pickAndUpload}>
            <Text style={S.btnText}>+ SEND FILE</Text>
          </TouchableOpacity>
        </View>
        {uploads.length > 0 && (
          <View style={{ gap: 6, marginTop: 8 }}>
            {uploads.slice(0, 5).map(u => (
              <View key={u.id} style={styles.uploadRow}>
                <Text style={styles.fileName} numberOfLines={1}>{u.name}</Text>
                <Text style={[
                  styles.statusText,
                  u.status === 'done' ? { color: C.green } : u.status === 'error' ? { color: C.red } : { color: C.gold }
                ]}>
                  {u.status === 'uploading' ? 'UPLOADING…' : u.status === 'done' ? '✓ SENT' : '✗ ERROR'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Laptop files */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <HudLabel>LAPTOP → PHONE</HudLabel>
          <TouchableOpacity style={[S.btn, styles.smallBtn]} onPress={loadLaptopFiles}>
            <Text style={S.btnText}>REFRESH</Text>
          </TouchableOpacity>
        </View>
        {loading
          ? <ActivityIndicator color={C.cyan} style={{ marginTop: 20 }} />
          : laptopFiles.length === 0
            ? <Text style={styles.emptyText}>No files available on laptop yet.</Text>
            : (
              <FlatList
                data={laptopFiles}
                keyExtractor={f => f.name}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.fileRow} onPress={() => downloadFile(item.name)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.fileMeta}>{formatSize(item.size)} · {relTime(item.ts)}</Text>
                    </View>
                    <Text style={styles.downloadBtn}>↓ DL</Text>
                  </TouchableOpacity>
                )}
              />
            )
        }
      </View>

      {!baseUrl && (
        <Text style={styles.offlineNote}>Connect to laptop to transfer files.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bg:        { flex: 1, backgroundColor: C.bg },
  section:   { padding: 16 },
  divider:   { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  smallBtn:  { paddingVertical: 5, paddingHorizontal: 10 },

  uploadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: C.border },
  fileRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border, gap: 8 },
  fileName:  { fontFamily: 'monospace', fontSize: 12, color: C.text },
  fileMeta:  { fontFamily: 'monospace', fontSize: 9,  color: C.dim, marginTop: 2 },
  statusText:{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, flexShrink: 0 },
  downloadBtn: { fontFamily: 'monospace', fontSize: 11, color: C.cyan, letterSpacing: 1 },
  emptyText: { fontFamily: 'monospace', fontSize: 11, color: C.dim, textAlign: 'center', marginTop: 16 },
  offlineNote: { fontFamily: 'monospace', fontSize: 11, color: C.red, textAlign: 'center', padding: 16 },
})
