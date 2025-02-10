"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function QueryBox() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only run client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    const encodedQuery = encodeURIComponent(query)
    router.push(`/chat?q=${encodedQuery}`)
  }

  // Don't render anything until mounted on client
  if (!mounted) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-gray-100 rounded-md animate-pulse" />
          <div className="w-16 h-9 bg-gray-100 rounded-md animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto px-4">
      <div className="flex gap-2">
        <Input
          placeholder="Ask about federal regulations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="default"
          disabled={!query.trim()}
        >
          Ask
        </Button>
      </div>
    </form>
  )
}
