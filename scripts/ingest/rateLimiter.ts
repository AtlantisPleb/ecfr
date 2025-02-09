export class RateLimiter {
  private lastCall: Date = new Date(0)
  private minDelay: number
  private baseDelay: number
  private maxDelay: number
  private currentDelay: number

  constructor(baseDelayMs = 1000, maxDelayMs = 10000) {
    this.baseDelay = baseDelayMs
    this.maxDelay = maxDelayMs
    this.minDelay = baseDelayMs
    this.currentDelay = baseDelayMs
  }

  async waitForNext(): Promise<void> {
    const now = new Date()
    const timeSinceLastCall = now.getTime() - this.lastCall.getTime()
    
    if (timeSinceLastCall < this.currentDelay) {
      const waitTime = this.currentDelay - timeSinceLastCall
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastCall = new Date()
    // Reset delay if we're not being rate limited
    this.currentDelay = this.baseDelay
  }

  handleError(error: Error): void {
    // Implement exponential backoff
    this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay)
    console.warn(`Rate limit hit, increasing delay to ${this.currentDelay}ms`)
  }

  resetDelay(): void {
    this.currentDelay = this.baseDelay
  }
}