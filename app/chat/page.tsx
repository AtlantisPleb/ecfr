"use client"

import { useChat } from "ai/react"
import { ChatInput } from "@/components/chat/ChatInput"
import { ChatMessages } from "@/components/chat/ChatMessages"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function ChatPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q")

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    onFinish: (message) => {
      console.log("Chat finished:", message)
    },
    onResponse: (response) => {
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))
      if (!response.ok) {
        console.error("Response not ok:", response.status, response.statusText)
      }
      return response
    },
    onError: (error) => {
      console.error("Chat error:", error)
    }
  })

  // Handle initial query from URL
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      console.log("Submitting initial query:", initialQuery)
      try {
        const message = { role: 'user', content: initialQuery }
        console.log("Submitting message:", message)
        handleSubmit(undefined as any, { input: initialQuery })
      } catch (e) {
        console.error("Error submitting query:", e)
      }
    }
  }, [initialQuery, messages.length, handleSubmit])

  useEffect(() => {
    console.log("Messages updated:", messages)
  }, [messages])

  useEffect(() => {
    console.log("Loading state:", isLoading)
  }, [isLoading])

  if (error) {
    return (
      <div className="flex-1 space-y-6">
        <div className="p-4 bg-red-50 text-red-500">
          Error: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="space-y-4 px-4">
        <h1 className="text-2xl font-bold text-center">eCFR Chat</h1>
        <p className="text-muted-foreground text-center">
          Ask questions about federal regulations
        </p>
      </div>

      <ChatMessages messages={messages} isLoading={isLoading} />

      <div className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% pb-4">
        <ChatInput
          onSubmit={async (value) => {
            console.log("Submitting new message:", value)
            try {
              await handleSubmit(undefined as any, { input: value })
            } catch (e) {
              console.error("Error submitting message:", e)
            }
          }}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}