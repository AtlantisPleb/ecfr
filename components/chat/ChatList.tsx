"use client"

import { Message } from "ai"
import { useEffect, useRef } from "react"
import { Separator } from "@/components/ui/separator"
import { ChatMessage } from "./ChatMessage"
import { ToolInvocation } from "./ToolInvocation"

export interface ChatListProps {
  messages: Message[]
  isLoading?: boolean
}

export function ChatList({ messages, isLoading }: ChatListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!messages.length && !isLoading) {
    return null;
  }

  const renderMessage = (message: Message, index: number) => {
    if (!message) return null;

    console.log('message:', message)

    const isAssistantMessage = message.role === 'assistant';
    const hasToolInvocations = isAssistantMessage && message.toolInvocations && message.toolInvocations.length > 0;
    const hasContent = message.content && message.content.trim() !== '';

    if (!hasContent && !hasToolInvocations) return null;

    return (
      <div key={`${message.id}-${index}`} className="flex-shrink-0">
        <div className="flex">
          {hasContent && (
            <ChatMessage message={message} />
          )}

          {hasToolInvocations && !hasContent && (
            <div className="flex-grow">
              {message.toolInvocations?.map((invocation: any, invIndex) => {
                // Extract tool name from function_call or use toolName
                console.log('invocation', invocation)
                const toolName = invocation.function_call?.name || invocation.toolName;
                // Extract args from function_call or use args
                const args = invocation.function_call?.arguments
                  ? JSON.parse(invocation.function_call.arguments)
                  : invocation.args;

                return (
                  <ToolInvocation
                    key={`${invocation.id || invocation.toolCallId}-${invIndex}`}
                    toolInvocation={{
                      toolCallId: invocation.id || invocation.toolCallId,
                      toolName,
                      args,
                      state: invocation.state,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {hasToolInvocations && hasContent && (
          <div className="mt-1">
            {message.toolInvocations?.map((invocation: any, invIndex) => {
              // Extract tool name from function_call or use toolName
              const toolName = invocation.function_call?.name || invocation.toolName;
              // Extract args from function_call or use args
              const args = invocation.function_call?.arguments
                ? JSON.parse(invocation.function_call.arguments)
                : invocation.args;

              return (
                <ToolInvocation
                  key={`${invocation.id || invocation.toolCallId}-${invIndex}`}
                  toolInvocation={{
                    toolCallId: invocation.id || invocation.toolCallId,
                    toolName,
                    args,
                    state: invocation.state,
                  }}
                />
              );
            })}
          </div>
        )}

        {index < messages.length - 1 && <Separator className="my-4" />}
      </div>
    );
  };

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      <div className="space-y-4 pb-24">
        {messages.map((message, index) => renderMessage(message, index))}
        {isLoading && (
          <div className="flex w-full items-center gap-2 rounded-lg bg-muted px-4 py-2">
            <span className="font-semibold">Assistant: </span>
            <p className="animate-pulse">Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} className="h-0" />
      </div>
    </div>
  );
}
