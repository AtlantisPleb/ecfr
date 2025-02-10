'use client'

import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { KeyboardEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = () => {
    if (query.trim()) {
      const encodedQuery = encodeURIComponent(query.trim())
      router.push(`/chat?q=${encodedQuery}`)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-center text-4xl font-medium">
          ChatCFR
        </h1>

        <div className="relative">
          <Textarea
            autoFocus={true}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about federal regulations..."
            className="min-h-[100px] resize-none text-lg p-4 pr-12 focus-visible:ring-offset-2"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            className="absolute bottom-3 right-3 h-8 w-8"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  )
}
