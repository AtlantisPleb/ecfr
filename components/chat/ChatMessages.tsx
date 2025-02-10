"use client"

import { Message } from "ai"
import { cn } from "@/lib/utils"

export interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  if (!messages.length) {
    return null
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      <div className="space-y-4 pb-24">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex w-full items-start gap-2 rounded-lg px-4 py-2",
              message.role === "user"
                ? "bg-white"
                : "bg-muted"
            )}
          >
            <span className="font-semibold">
              {message.role === "user" ? "You: " : "Assistant: "}
            </span>
            <div className="flex-1 space-y-2">
              <p className="prose break-words">
                {message.content}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full items-center gap-2 rounded-lg bg-muted px-4 py-2">
            <span className="font-semibold">Assistant: </span>
            <p className="animate-pulse">Thinking...</p>
          </div>
        )}
      </div>
    </div>
  )
}