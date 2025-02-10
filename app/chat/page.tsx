"use client"

import { useChat } from "ai/react"
import { ChatInput } from "@/components/chat/ChatInput"
import { ChatMessages } from "@/components/chat/ChatMessages"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function ChatPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q")

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    onResponse: (response) => {
      console.log("Got response:", response)
    },
    onError: (error) => {
      console.error("Chat error:", error)
    }
  })

  // Handle initial query from URL
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      console.log("Submitting initial query:", initialQuery)
      const event = new Event("submit") as any;
      handleSubmit(event, { input: initialQuery })
    }
  }, [initialQuery, messages.length, handleSubmit])

  useEffect(() => {
    console.log("Messages updated:", messages)
  }, [messages])

  useEffect(() => {
    console.log("Loading state:", isLoading)
  }, [isLoading])

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
            const event = new Event("submit") as any;
            await handleSubmit(event, { input: value })
          }}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}