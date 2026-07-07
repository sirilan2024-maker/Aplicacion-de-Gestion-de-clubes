"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { getChannelsAction, getMessagesAction, sendMessageAction } from "@/app/actions/chat-actions"
import { Loader2, Send, Megaphone, Users, MessageCircle, AlertCircle, Info } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

export function ChatLayout() {
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<any[]>([])
  const [activeChannel, setActiveChannel] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [clubId, setClubId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  useEffect(() => {
    async function initChat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single()
      if (profile?.club_id) {
        setClubId(profile.club_id)
        setUserRole(profile.role)
        const res = await getChannelsAction(profile.club_id)
        if (res.success && res.data) {
          setChannels(res.data)
          if (res.data.length > 0) {
            setActiveChannel(res.data[0]) // default to first
          }
        }
      }
      setLoading(false)
    }
    initChat()
  }, [])

  useEffect(() => {
    if (!activeChannel) return

    let isMounted = true
    const fetchMessages = async () => {
      const res = await getMessagesAction(activeChannel.id)
      if (res.success && isMounted && res.data) {
        setMessages(res.data)
      }
    }
    fetchMessages()

    // Subscribe to realtime messages for this channel
    const channel = supabase.channel(`chat_${activeChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${activeChannel.id}`
        },
        async (payload) => {
          // Fetch sender info for the new message
          const { data: profile } = await supabase.from('profiles').select('first_name, last_name, role').eq('id', payload.new.sender_id).single()
          const newMsg = {
            ...payload.new,
            profiles: profile || { first_name: 'Usuario', last_name: 'Desconocido', role: '' }
          }
          if (isMounted) {
            setMessages(prev => [...prev, newMsg])
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [activeChannel])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChannel) return
    
    setSending(true)
    const content = newMessage
    setNewMessage("") // Optimistic clear
    
    const res = await sendMessageAction(activeChannel.id, content)
    if (!res.success) {
      toast.error(res.error || "Error al enviar mensaje")
      setNewMessage(content) // Restore if failed
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const canPostInActiveChannel = activeChannel?.type !== 'global' || (userRole === 'admin' || userRole === 'staff' || userRole === 'coach' || userRole === 'entrenador')

  return (
    <div className="h-[calc(100vh-100px)] max-h-[800px] max-w-6xl mx-auto p-4 flex">
      <Toaster />
      
      <div className="flex w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-1/3 min-w-[280px] border-r border-gray-100 flex flex-col bg-gray-50/50">
          <div className="p-4 border-b border-gray-100 bg-white">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              Mensajes
            </h2>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
            {channels.length === 0 && (
              <p className="text-sm text-gray-500 text-center p-4">No hay canales disponibles</p>
            )}
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  activeChannel?.id === channel.id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'hover:bg-white hover:shadow-sm text-gray-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  activeChannel?.id === channel.id ? 'bg-white/20' : 
                  channel.type === 'global' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {channel.type === 'global' ? <Megaphone size={18} /> : <Users size={18} />}
                </div>
                <div className="flex-1 truncate">
                  <p className="font-semibold text-sm truncate">{channel.name}</p>
                  <p className={`text-xs truncate ${activeChannel?.id === channel.id ? 'text-blue-100' : 'text-gray-400'}`}>
                    {channel.type === 'global' ? 'Anuncios del Club' : 'Grupo del Equipo'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 flex flex-col bg-[#F9FAFB] relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
          {activeChannel ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activeChannel.type === 'global' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {activeChannel.type === 'global' ? <Megaphone size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{activeChannel.name}</h3>
                  <p className="text-xs text-gray-500">
                    {activeChannel.type === 'global' ? 'Canal de solo lectura para familias' : 'Chat grupal oficial del equipo'}
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-center my-6">
                  <span className="bg-gray-200/60 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                    Inicio de la conversación
                  </span>
                </div>
                
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === userId
                  const showHeader = i === 0 || messages[i-1].sender_id !== msg.sender_id
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && showHeader && (
                        <span className="text-xs font-bold text-gray-500 mb-1 ml-1 flex items-center gap-1">
                          {msg.profiles?.first_name} {msg.profiles?.last_name}
                          {msg.profiles?.role === 'admin' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase">Admin</span>}
                          {msg.profiles?.role === 'coach' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">Míster</span>}
                        </span>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative group ${
                        isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                      }`}>
                        <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                        <span className={`text-[10px] block mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                {canPostInActiveChannel ? (
                  <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-md shadow-blue-200 active:scale-95 shrink-0"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                    </button>
                  </form>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 text-amber-800 text-sm p-3 rounded-xl flex items-center justify-center gap-2 text-center">
                    <Info size={16} />
                    Este es un canal de anuncios. Solo los administradores pueden escribir aquí.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-16 h-16 mb-4 text-gray-200" />
              <p className="text-lg">Selecciona un canal para empezar a chatear</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Custom Styles for Scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #D1D5DB; }
      `}} />
    </div>
  )
}
