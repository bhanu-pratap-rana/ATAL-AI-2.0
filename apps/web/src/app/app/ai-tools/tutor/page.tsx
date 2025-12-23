'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { askAITutor } from '@/app/actions/ai'
import { createClient } from '@/lib/supabase-browser'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AITutorPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<'en' | 'hi' | 'as'>('en')
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/student/start')
        return
      }
      setIsAuthChecking(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const result = await askAITutor(input.trim(), {
        language,
        studentLevel: 'beginner',
        previousMessages: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })

      if (result.success && result.data?.content) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data.content,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        toast.error(result.error || 'Failed to get response')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    'What is a computer?',
    'How does the internet work?',
    'What is email?',
    'How to stay safe online?',
  ]

  // Show loading while checking auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream page-layout">
      <div className="container-responsive max-w-4xl">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/app/ai-tools"
            className="text-primary hover:text-primary-dark mb-4 inline-flex items-center gap-1 text-sm touch-target"
          >
            ← Back to AI Tools
          </Link>
          <h1 className="heading-2 text-primary mb-1">💬 AI Tutor</h1>
          <p className="text-text-secondary text-sm">
            Ask questions about digital literacy and get personalized help
          </p>
        </div>

        {/* Language Selector */}
        <div className="flex gap-2 mb-4">
          {(['en', 'hi', 'as'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                language === lang
                  ? 'bg-primary text-white'
                  : 'bg-white text-text-secondary hover:bg-primary-light'
              }`}
            >
              {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'অসমীয়া'}
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="h-[400px] overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">
                    Start a conversation with your AI tutor!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="px-3 py-2 bg-primary-light text-primary rounded-lg text-sm hover:bg-primary-lighter transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-white border border-border'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === 'user'
                            ? 'text-white/70'
                            : 'text-text-tertiary'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border rounded-lg p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-primary-light border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">💡 Tips for better answers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-xs text-text-secondary space-y-1">
              <li>• Ask specific questions about digital literacy topics</li>
              <li>• Include context about what you&apos;re trying to learn</li>
              <li>• Feel free to ask follow-up questions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
