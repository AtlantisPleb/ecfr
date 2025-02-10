"use client"

import { Message } from "ai"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 rounded-lg px-4 py-2",
        message.role === "user"
          ? "bg-white"
          : "bg-muted"
      )}
    >
      <span className="text-sm">
        {message.role === "user" ? "> " : ""}
      </span>
      <div className="flex-1 space-y-2">
        <ReactMarkdown className="prose break-words text-sm">
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}