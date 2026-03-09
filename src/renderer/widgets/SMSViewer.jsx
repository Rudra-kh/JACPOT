import React, { useEffect, useState, useRef, useCallback } from 'react'
import { MessageSquare, Send, Search, Circle } from 'lucide-react'
import WidgetCard from '../components/WidgetCard'
import { useAppStore } from '../store/appStore'

function avatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#00c8ff', '#a855f7', '#00ff88', '#ff6b2b', '#ffd700', '#ff4444']
  return colors[Math.abs(hash) % colors.length]
}

function Avatar({ name = '?' }) {
  const initial = name.charAt(0).toUpperCase()
  const color = avatarColor(name)
  return (
    <div
      style={{
        width: 30, height: 30, borderRadius: '50%',
        background: `${color}22`, border: `1px solid ${color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, fontSize: '0.7rem', fontFamily: 'Orbitron', fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  )
}

function relativeTime(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(ts).toLocaleDateString()
}

export default function SMSViewer() {
  const activeSmsThread = useAppStore((s) => s.activeSmsThread)
  const setActiveSmsThread = useAppStore((s) => s.setActiveSmsThread)
  const mobile = useAppStore((s) => s.mobile)
  const addToast = useAppStore((s) => s.addToast)
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef(null)

  const loadConversations = useCallback(async () => {
    const data = await window.api?.sms.getConversations()
    if (data) setConversations(data)
  }, [])

  const loadThread = useCallback(async (threadId) => {
    const data = await window.api?.sms.getThread(threadId)
    if (data) {
      setMessages(data)
      await window.api?.sms.markRead(threadId)
      loadConversations()
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (activeSmsThread) loadThread(activeSmsThread)
  }, [activeSmsThread])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!replyText.trim() || !activeSmsThread) return
    const conv = conversations.find(c => c.thread_id === activeSmsThread)
    if (!conv) return
    const result = await window.api?.sms.send({
      number: conv.contact_number,
      message: replyText,
      deviceId: mobile.deviceId,
    })
    if (result?.ok) {
      setReplyText('')
      // Optimistically add message
      setMessages(ms => [...ms, { id: Date.now(), body: replyText, direction: 'out', ts: Date.now() }])
    } else {
      addToast({ title: 'SMS', message: 'Failed to send message.', type: 'error' })
    }
  }

  const filteredConvs = conversations.filter(c =>
    !search ||
    (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.contact_number.includes(search) ||
    (c.last_msg || '').toLowerCase().includes(search.toLowerCase())
  )

  const activeConv = conversations.find(c => c.thread_id === activeSmsThread)

  // Character count (SMS segments)
  const charCount = replyText.length
  const segment = Math.ceil(charCount / 160) || 1

  return (
    <WidgetCard id="sms" title="SMS VIEWER" icon={MessageSquare}>
      <div className="flex gap-2" style={{ height: 480 }}>
        {/* ── Left: Conversation list ── */}
        <div className="flex flex-col" style={{ width: 160, flexShrink: 0, borderRight: '1px solid rgba(0,200,255,0.08)' }}>
          {/* Search */}
          <div className="flex items-center gap-1 p-1.5 border-b" style={{ borderColor: 'rgba(0,200,255,0.06)' }}>
            <Search size={9} style={{ color: 'rgba(200,238,255,0.3)', flexShrink: 0 }} />
            <input
              className="bg-transparent outline-none flex-1"
              style={{ fontFamily: 'Rajdhani', fontSize: '0.65rem', color: '#c8eeff', border: 'none' }}
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div style={{ padding: '12px 8px', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani', textAlign: 'center' }}>
                No messages
              </div>
            ) : (
              filteredConvs.map(c => (
                <button
                  key={c.thread_id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 transition-colors text-left"
                  style={{
                    background: activeSmsThread === c.thread_id ? 'rgba(0,200,255,0.08)' : 'transparent',
                    borderLeft: activeSmsThread === c.thread_id ? '2px solid #00c8ff' : '2px solid transparent',
                  }}
                  onClick={() => setActiveSmsThread(c.thread_id)}
                >
                  <Avatar name={c.contact_name || c.contact_number} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate" style={{ fontSize: '0.68rem', color: '#c8eeff', fontFamily: 'Rajdhani', fontWeight: 600 }}>
                        {c.contact_name || c.contact_number}
                      </span>
                      {c.unread > 0 && (
                        <span style={{
                          fontSize: '0.5rem', color: '#020c18', background: '#00c8ff',
                          borderRadius: '50%', width: 14, height: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'Orbitron', flexShrink: 0,
                        }}>
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <div className="truncate" style={{ fontSize: '0.58rem', color: 'var(--text-dim)', fontFamily: 'Rajdhani' }}>
                      {c.last_msg}
                    </div>
                    <div style={{ fontSize: '0.5rem', color: 'rgba(200,238,255,0.2)', fontFamily: 'Share Tech Mono' }}>
                      {relativeTime(c.last_ts)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Thread ── */}
        <div className="flex flex-col flex-1 min-w-0">
          {!activeSmsThread ? (
            <div className="flex-1 flex items-center justify-center">
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'Rajdhani', fontSize: '0.7rem' }}>
                Select a conversation
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b" style={{ borderColor: 'rgba(0,200,255,0.08)' }}>
                <Avatar name={activeConv?.contact_name || activeConv?.contact_number} />
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#00c8ff', fontFamily: 'Orbitron', letterSpacing: '0.05em' }}>
                    {activeConv?.contact_name || activeConv?.contact_number}
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono' }}>
                    {activeConv?.contact_number}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pb-1" style={{ minHeight: 0 }}>
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={m.direction === 'out' ? 'chat-bubble-out' : 'chat-bubble-in'}
                      style={{ maxWidth: '75%', position: 'relative' }}
                      title={new Date(m.ts).toLocaleTimeString()}
                    >
                      <span style={{ fontFamily: 'Rajdhani', fontSize: '0.75rem', color: '#c8eeff' }}>
                        {m.body}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="flex items-end gap-1.5 pt-1.5 border-t" style={{ borderColor: 'rgba(0,200,255,0.08)' }}>
                <div className="flex-1 relative">
                  <textarea
                    className="hud-input w-full resize-none"
                    style={{ padding: '4px 6px', fontSize: '0.72rem', lineHeight: '1.4', minHeight: 40 }}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Type message..."
                    rows={2}
                  />
                  <div
                    style={{
                      position: 'absolute', bottom: 4, right: 6,
                      fontSize: '0.5rem', color: charCount > 160 ? '#ffd700' : 'rgba(200,238,255,0.25)',
                      fontFamily: 'Share Tech Mono',
                    }}
                  >
                    {charCount}{segment > 1 ? ` (${segment}/3)` : ''}
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  className="flex items-center justify-center rounded transition-all"
                  style={{
                    width: 32, height: 32,
                    background: replyText.trim() ? 'rgba(0,200,255,0.15)' : 'transparent',
                    border: '1px solid rgba(0,200,255,0.3)',
                    color: '#00c8ff',
                    flexShrink: 0,
                  }}
                >
                  <Send size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </WidgetCard>
  )
}
