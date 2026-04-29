import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import type { WeatherHour, CalendarEvent } from '@/data/mockData'
import { getActivityRecommendation, type ChatMessage } from '@/lib/chatEngine'

interface ChatBotProps {
  hourly: WeatherHour[]
  events: CalendarEvent[]
}

function BotMessage({ text }: { text: string }) {
  // Render **bold** markdown
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : part.split('\n').map((line, j, arr) => (
              <span key={`${i}-${j}`}>
                {line.startsWith('•') ? (
                  <span className="flex gap-1.5"><span>•</span><span>{line.slice(1).trim()}</span></span>
                ) : line}
                {j < arr.length - 1 && <br />}
              </span>
            ))
      )}
    </span>
  )
}

const GREETING = "Hey! I'm Mad Dog Murph 🌤️ Tell me what you want to do today and I'll find the best time based on the weather.\n\nTry: *\"When should I go for a run?\"* or *\"Best time for a walk with a friend?\"*"

export default function ChatBot({ hourly, events }: ChatBotProps) {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greeting', role: 'assistant', text: GREETING, timestamp: new Date() },
  ])
  const [typing, setTyping]   = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  function handleSend() {
    const text = input.trim()
    if (!text) return

    const userMsg: ChatMessage = {
      id:        Date.now().toString(),
      role:      'user',
      text,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      const reply = getActivityRecommendation(text, hourly, events)
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', text: reply, timestamp: new Date() },
      ])
      setTyping(false)
    }, 600)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden"
             style={{ height: '440px' }}>
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center gap-2">
            <span className="text-lg">🌤️</span>
            <div>
              <p className="text-sm font-semibold text-primary-foreground leading-none">Mad Dog Murph</p>
              <p className="text-xs text-primary-foreground/70 leading-none mt-0.5">Weather activity planner</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-secondary/60 text-foreground rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant'
                    ? <BotMessage text={msg.text} />
                    : msg.text
                  }
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-secondary/60 rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/50 px-3 py-3 flex gap-2 items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. When should I go for a run?"
              className="flex-1 text-sm bg-secondary/50 rounded-xl px-3 py-2 outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/40"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:scale-105 transition-transform"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
