"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function QueryBox() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    // Encode query for URL
    const encodedQuery = encodeURIComponent(query)
    router.push(`/chat?q=${encodedQuery}`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    console.log('Input value:', value)
    console.log('Trimmed value:', value.trim())
    setQuery(value)
  }

  const isDisabled = isLoading || !query.trim()
  console.log('Button disabled:', isDisabled, { isLoading, query })

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto px-4">
      <div className="flex gap-2">
        <Input
          placeholder="Ask about federal regulations..."
          value={query}
          onChange={handleInputChange}
          className="flex-1"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isDisabled}
          className={isDisabled ? 'opacity-50' : ''}
        >
          {isLoading ? "Loading..." : "Ask"}
        </Button>
      </div>
    </form>
  )
}