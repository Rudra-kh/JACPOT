/**
 * SmsScreen — read SMS from Android and sync to laptop; send replies.
 * Reading requires READ_SMS permission (granted in app.json android.permissions).
 * react-native-get-sms-android provides native ContentResolver access (EAS build only).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, PermissionsAndroid, Alert, StatusBar, ActivityIndicator,
} from 'react-native'
import { C, S } from '../theme'
import * as bridge from '../services/bridge'
import { HudLabel } from '../components/HudText'

let SmsAndroid = null
try { SmsAndroid = require('react-native-get-sms-android').default } catch { /* not available in Expo Go */ }

function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return ['#00c8ff', '#a855f7', '#00ff88', '#ff6b2b', '#ffd700', '#ff4444'][Math.abs(h) % 6]
}

function relTime(ts) {
  const d = (Date.now() - ts) / 1000
  if (d < 60) return `${Math.floor(d)}s`
  if (d < 3600) return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return new Date(ts).toLocaleDateString()
}

export default function SmsScreen() {
  const [hasPerm,       setHasPerm]       = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeThread,  setActiveThread]  = useState(null)  // { address, name, messages }
  const [replyText,     setReplyText]     = useState('')
  const [loading,       setLoading]       = useState(false)
  const flatRef = useRef(null)

  // --- Permissions ---
  const requestPerms = useCallback(async () => {
    try {
      const read = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS)
      const send = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS)
      const ok   = read === PermissionsAndroid.RESULTS.GRANTED && send === PermissionsAndroid.RESULTS.GRANTED
      setHasPerm(ok)
      if (ok) loadConversations()
    } catch { setHasPerm(false) }
  }, [])

  useEffect(() => {
    if (!SmsAndroid) { setHasPerm(false); return }
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS).then(granted => {
      setHasPerm(granted)
      if (granted) loadConversations()
    })
  }, [])

  // --- Load conversations ---
  const loadConversations = useCallback(() => {
    if (!SmsAndroid) return
    setLoading(true)
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', maxCount: 200, indexFrom: 0 }),
      (fail) => { setLoading(false); console.warn('SMS error:', fail) },
      (_count, msgList) => {
        const msgs = JSON.parse(msgList)
        // Group by address (thread)
        const threads = {}
        for (const m of msgs) {
          if (!threads[m.address]) {
            threads[m.address] = { address: m.address, name: m.address, messages: [], unread: 0 }
          }
          threads[m.address].messages.push({ body: m.body, date: m.date, type: m.type })
          if (m.read === '0') threads[m.address].unread++
        }
        const list = Object.values(threads)
          .sort((a, b) => (b.messages[0]?.date ?? 0) - (a.messages[0]?.date ?? 0))
        setConversations(list)
        setLoading(false)
        // Sync to laptop
        bridge.send({ type: 'sms_sync', data: list.map(t => ({
          thread_id: t.address,
          contact_name: t.name,
          contact_number: t.address,
          last_msg: t.messages[t.messages.length - 1]?.body,
          last_ts: t.messages[t.messages.length - 1]?.date,
          unread: t.unread,
        }))})
      }
    )
  }, [])

  // --- Handle send_sms command from laptop ---
  useEffect(() => {
    const unsub = bridge.on('cmd:send_sms', (msg) => {
      if (!msg.to || !msg.message) return
      SmsAndroid?.autoSend(
        msg.to,
        msg.message,
        (fail) => console.warn('Send fail:', fail),
        () => {}
      )
    })
    return () => unsub()
  }, [])

  const openThread = (thread) => setActiveThread(thread)

  const sendReply = () => {
    if (!replyText.trim() || !activeThread) return
    if (!SmsAndroid) return
    const text = replyText.trim()
    SmsAndroid.autoSend(
      activeThread.address,
      text,
      (fail) => Alert.alert('Failed', fail),
      () => {
        setReplyText('')
        // Add to local thread
        setActiveThread(prev => ({
          ...prev,
          messages: [...prev.messages, { body: text, date: Date.now(), type: 2 }],
        }))
      }
    )
  }

  // --- No native module ---
  if (!SmsAndroid) {
    return (
      <View style={[styles.bg, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Text style={styles.errorTitle}>SMS NOT AVAILABLE</Text>
        <Text style={styles.errorBody}>
          SMS reading requires a native build.{'\n'}
          Build the APK with EAS Build:{'\n\n'}
          {'  '}cd mobile{'\n'}
          {'  '}npm install{'\n'}
          {'  '}eas build -p android --profile preview
        </Text>
      </View>
    )
  }

  // --- No permission ---
  if (hasPerm === false) {
    return (
      <View style={[styles.bg, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Text style={styles.errorTitle}>PERMISSION REQUIRED</Text>
        <Text style={styles.errorBody}>READ_SMS and SEND_SMS permissions are needed.</Text>
        <TouchableOpacity style={[S.btn, { marginTop: 16 }]} onPress={requestPerms}>
          <Text style={S.btnText}>GRANT PERMISSIONS</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // --- Thread view ---
  if (activeThread) {
    return (
      <View style={styles.bg}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={styles.threadHeader}>
          <TouchableOpacity onPress={() => setActiveThread(null)}>
            <Text style={styles.back}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.threadTitle} numberOfLines={1}>{activeThread.address}</Text>
        </View>
        <FlatList
          ref={flatRef}
          data={activeThread.messages}
          keyExtractor={(_, i) => String(i)}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item }) => {
            const sent = item.type === 2
            return (
              <View style={[styles.bubble, sent ? styles.bubbleSent : styles.bubbleIn]}>
                <Text style={[styles.bubbleText, sent && { color: C.cyan }]}>{item.body}</Text>
                <Text style={styles.bubbleTime}>{relTime(item.date)}</Text>
              </View>
            )
          }}
        />
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Type a reply…"
            placeholderTextColor={C.dim}
            multiline
          />
          <TouchableOpacity style={[S.btn, styles.sendBtn]} onPress={sendReply}>
            <Text style={S.btnText}>SEND</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // --- Conversation list ---
  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.listHeader}>
        <Text style={styles.screenTitle}>MESSAGES</Text>
        <TouchableOpacity style={S.btn} onPress={loadConversations}>
          <Text style={S.btnText}>SYNC ↑</Text>
        </TouchableOpacity>
      </View>
      {loading
        ? <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} size="large" />
        : (
          <FlatList
            data={conversations}
            keyExtractor={i => i.address}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const color = avatarColor(item.address)
              const last  = item.messages[item.messages.length - 1]
              return (
                <TouchableOpacity style={styles.convoRow} onPress={() => openThread(item)}>
                  <View style={[styles.avatar, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                    <Text style={[styles.avatarText, { color }]}>{item.address.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.convoName} numberOfLines={1}>{item.address}</Text>
                      {last?.date ? <Text style={styles.convoTime}>{relTime(last.date)}</Text> : null}
                    </View>
                    <Text style={styles.convoPreview} numberOfLines={1}>{last?.body ?? ''}</Text>
                  </View>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            }}
          />
        )
      }
    </View>
  )
}

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  errorTitle: { fontFamily: 'monospace', fontSize: 14, color: C.red,  letterSpacing: 2, marginBottom: 12 },
  errorBody:  { fontFamily: 'monospace', fontSize: 11, color: C.dim,  textAlign: 'center', lineHeight: 18 },

  listHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  screenTitle:   { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: C.text, letterSpacing: 2 },

  convoRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderColor: C.border },
  avatar:      { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' },
  convoName:   { fontFamily: 'monospace', fontSize: 12, color: C.text, flex: 1 },
  convoTime:   { fontFamily: 'monospace', fontSize: 9,  color: C.dim },
  convoPreview:{ fontFamily: 'monospace', fontSize: 10, color: C.dim },
  unreadBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
  unreadText:  { fontFamily: 'monospace', fontSize: 9, color: C.bg, fontWeight: 'bold' },

  threadHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderBottomWidth: 1, borderColor: C.border },
  back:        { fontFamily: 'monospace', fontSize: 11, color: C.cyan, letterSpacing: 1 },
  threadTitle: { fontFamily: 'monospace', fontSize: 12, color: C.text, flex: 1 },

  bubble:     { maxWidth: '78%', padding: 10, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start', borderColor: C.border, backgroundColor: C.bg2 },
  bubbleSent: { alignSelf: 'flex-end', borderColor: 'rgba(0,200,255,0.25)', backgroundColor: 'rgba(0,200,255,0.06)' },
  bubbleText: { fontFamily: 'monospace', fontSize: 12, color: C.text, lineHeight: 18 },
  bubbleTime: { fontFamily: 'monospace', fontSize: 9, color: C.dim, marginTop: 4, alignSelf: 'flex-end' },

  replyBar:   { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: C.border, backgroundColor: C.bg2 },
  replyInput: { flex: 1, fontFamily: 'monospace', fontSize: 12, color: C.text, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, maxHeight: 80 },
  sendBtn:    { paddingHorizontal: 14 },
})
