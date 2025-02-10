"use client"

import { useChat } from "ai/react"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"
import { ChatInput } from "@/components/chat/ChatInput"
import { ChatMessages } from "@/components/chat/ChatMessages"

function ChatPageInner() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q")

  const { messages, append, isLoading, error } = useChat({
    api: "/api/chat",
    keepLastMessageOnError: true,
    maxSteps: 20,
    onFinish: (message) => {
      console.log("Chat finished:", message)
    },
    onError: (error) => {
      console.error("Chat error:", error)
    }
  })

  // Send initial query when component mounts
  useEffect(() => {
    const sendInitialQuery = async () => {
      if (initialQuery) {
        console.log("Sending initial query:", initialQuery)
        await append({
          role: 'user',
          content: initialQuery,
        })
      }
    }
    sendInitialQuery()
  }, [initialQuery]) // Only run when initialQuery changes

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
            await append({
              role: 'user',
              content: value,
            })
          }}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 space-y-6">
        <div className="space-y-4 px-4">
          <h1 className="text-2xl font-bold text-center">eCFR Chat</h1>
          <p className="text-muted-foreground text-center">Loading...</p>
        </div>
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  )
}
