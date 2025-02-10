"use client"

import { Message } from "ai"
import { ChatList } from "./ChatList"

export interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  return <ChatList messages={messages} isLoading={isLoading} />
}