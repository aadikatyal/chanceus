"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { sendMessage } from "@/lib/chat-actions"
import type { Message, User } from "@/lib/supabase/client"
// Helper function to format time
const formatTime = (date: string) => {
  const now = new Date()
  const messageDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

interface ChatWindowProps {
  messageType: "match" | "global" | "dm" | "tournament"
  currentUser: User
  matchId?: string
  tournamentId?: string
  recipientId?: string
  title?: string
  maxHeight?: string
  /** Presentation only — embed in Social hub / competitive shell */
  appearance?: "legacy" | "chance"
}

export default function ChatWindow({
  messageType,
  currentUser,
  matchId,
  tournamentId,
  recipientId,
  title,
  maxHeight = "400px",
  appearance = "legacy",
}: ChatWindowProps) {
  const isChance = appearance === "chance"
  const fillParent = isChance && maxHeight === "100%"
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll chat pane only — never scrollIntoView (that jumps the whole page on Social hub load)
  useEffect(() => {
    if (messages.length === 0) return
    const pane = chatContainerRef.current
    if (!pane) return
    pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" })
  }, [messages])

  // Load initial messages
  useEffect(() => {
    loadMessages()
  }, [messageType, matchId, tournamentId, recipientId])

  // Subscribe to real-time updates
  useEffect(() => {
    if (isLoading) return // Don't subscribe until initial load is complete

    const channelName = `messages-${messageType}-${matchId || tournamentId || recipientId || 'global'}`
    const channel = supabase.channel(channelName)

    // Set up filter based on message type
    let filter: string
    if (messageType === "match" && matchId) {
      filter = `message_type=eq.match`
    } else if (messageType === "tournament" && tournamentId) {
      filter = `message_type=eq.tournament`
    } else if (messageType === "dm" && recipientId) {
      filter = `message_type=eq.dm`
    } else {
      filter = `message_type=eq.global`
    }

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: filter,
        },
        async (payload) => {
          const newMessage = payload.new as any
          
          // Additional filtering for match/tournament/dm
          if (messageType === "match" && matchId && newMessage.match_id !== matchId) {
            return
          }
          if (messageType === "tournament" && tournamentId && newMessage.tournament_id !== tournamentId) {
            return
          }
          if (messageType === "dm" && recipientId) {
            const isRelevant = 
              (newMessage.sender_id === currentUser.id && newMessage.recipient_id === recipientId) ||
              (newMessage.sender_id === recipientId && newMessage.recipient_id === currentUser.id)
            if (!isRelevant) return
          }

          // Fetch sender info
          const { data: senderData } = await supabase
            .from("users")
            .select("id, username, display_name, avatar_url")
            .eq("id", newMessage.sender_id)
            .single()

          if (senderData) {
            console.log("New message received:", newMessage)
            setMessages((prev) => [
              ...prev,
              { ...newMessage, sender: senderData } as Message,
            ])
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status)
      })

    return () => {
      console.log("Unsubscribing from channel:", channelName)
      supabase.removeChannel(channel)
    }
  }, [messageType, matchId, tournamentId, recipientId, currentUser.id, isLoading])

  const loadMessages = async () => {
    setIsLoading(true)
    try {
      // Build base query
      let query = supabase
        .from("messages")
        .select("*")
        .eq("message_type", messageType)
        .order("created_at", { ascending: false })
        .limit(50)

      if (messageType === "match" && matchId) {
        query = query.eq("match_id", matchId)
      } else if (messageType === "tournament" && tournamentId) {
        query = query.eq("tournament_id", tournamentId)
      } else if (messageType === "dm" && recipientId) {
        query = query.or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUser.id})`)
      }

      const { data: messagesData, error } = await query

      if (error) {
        console.error("Error loading messages:", error)
        setMessages([])
        return
      }

      if (!messagesData || messagesData.length === 0) {
        console.log("No messages found")
        setMessages([])
        return
      }

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map((msg: any) => msg.sender_id))]
      
      // Fetch all senders at once
      const { data: sendersData } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url")
        .in("id", senderIds)

      // Create a map for quick lookup
      const sendersMap = new Map(
        (sendersData || []).map((sender) => [sender.id, sender])
      )

      // Combine messages with sender data
      const messagesWithSenders = messagesData.map((msg: any) => ({
        ...msg,
        sender: sendersMap.get(msg.sender_id) || null,
      })) as Message[]

      console.log(`Loaded ${messagesWithSenders.length} messages`)
      setMessages(messagesWithSenders.reverse())
    } catch (error) {
      console.error("Error loading messages:", error)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    const messageContent = inputValue.trim()
    setIsSending(true)
    setInputValue("") // Clear input immediately for better UX
    
    try {
      const result = await sendMessage(messageContent, messageType, {
        matchId,
        tournamentId,
        recipientId,
      })

      if (result.error) {
        console.error("Error sending message:", result.error)
        setInputValue(messageContent) // Restore message if failed
      } else {
        // Reload messages to ensure it appears (realtime might have delay)
        setTimeout(() => {
          loadMessages()
        }, 500)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setInputValue(messageContent) // Restore message if failed
    } finally {
      setIsSending(false)
    }
  }

  const getDisplayName = (message: Message) => {
    if (message.sender) {
      return message.sender.display_name || message.sender.username
    }
    return "Unknown"
  }

  const getAvatarUrl = (message: Message) => {
    return message.sender?.avatar_url || null
  }

  return (
    <Card
      className={
        isChance
          ? fillParent
            ? "flex h-full min-h-0 w-full max-w-full flex-col gap-0 border-0 bg-transparent py-0 shadow-none"
            : "flex flex-col border-0 bg-transparent shadow-none"
          : "bg-gray-900/80 border-gray-800 flex flex-col"
      }
      style={fillParent ? undefined : { maxHeight }}
    >
      {title && !isChance && (
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex min-h-0 flex-1 flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <div
          ref={chatContainerRef}
          className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3"
          style={fillParent ? undefined : { maxHeight: `calc(${maxHeight} - 120px)` }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center">
              <p className={isChance ? "chance-text-caption" : "text-gray-500"}>
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUser.id
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={getAvatarUrl(message)} />
                    <AvatarFallback
                      className={
                        isChance
                          ? "bg-[var(--chance-brand)] text-[var(--chance-brand-fg)] text-xs"
                          : "bg-orange-500 text-black text-xs"
                      }
                    >
                      {getDisplayName(message).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex flex-col max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? isChance
                            ? "bg-[var(--chance-brand)] text-[var(--chance-brand-fg)]"
                            : "bg-orange-500 text-black"
                          : isChance
                            ? "border border-[var(--chance-border)] bg-[var(--chance-surface-inset)] text-[var(--chance-fg)]"
                            : "bg-gray-800 text-white"
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                    </div>
                    <span className={`mt-1 text-xs ${isChance ? "chance-text-caption" : "text-gray-500"}`}>
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSend}
          className={isChance ? "border-t border-[var(--chance-border)] p-4" : "p-4 border-t border-gray-800"}
        >
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className={isChance ? "chance-input flex-1" : "bg-gray-800 border-gray-700 text-white flex-1"}
              disabled={isSending}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className={
                isChance ? "chance-hero-cta-primary chance-focus-ring shrink-0 px-3" : "bg-orange-500 hover:bg-orange-600 text-black"
              }
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

