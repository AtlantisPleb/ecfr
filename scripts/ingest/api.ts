import { ECFRAgency, ECFRTitle, ProcessedContent } from './types.js'
import { RateLimiter } from './rateLimiter.js'

const BASE_URL = 'https://www.ecfr.gov/api'
const rateLimiter = new RateLimiter()

async function fetchWithRetry(url: string, maxRetries = 5): Promise<any> {
  let retryCount = 0
  let lastError: Error | null = null

  while (retryCount < maxRetries) {
    try {
      await rateLimiter.waitForNext()
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 429) {
          rateLimiter.handleError(new Error('Rate limit exceeded'))
          continue // Retry immediately with increased delay
        }
        
        if (response.status === 503) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 second delay
          console.log(`Service unavailable, retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          retryCount++
          continue
        }

        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      lastError = error as Error
      if (retryCount === maxRetries - 1) {
        console.error(`Failed after ${maxRetries} retries:`, error)
        throw error
      }
      retryCount++
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
      console.log(`Error fetching ${url}, retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

export async function fetchAgencies(): Promise<ECFRAgency[]> {
  const data = await fetchWithRetry(`${BASE_URL}/admin/v1/agencies.json`)
  return data.agencies
}

export async function fetchTitles(): Promise<ECFRTitle[]> {
  const data = await fetchWithRetry(`${BASE_URL}/versioner/v1/titles.json`)
  return data.titles
}

export async function fetchTitleContent(titleNumber: number, date: string = 'current'): Promise<ProcessedContent> {
  const url = `${BASE_URL}/versioner/v1/full/${date}/title-${titleNumber}.xml`
  
  let retryCount = 0
  const maxRetries = 5
  let lastError: Error | null = null

  while (retryCount < maxRetries) {
    try {
      await rateLimiter.waitForNext()
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 429) {
          rateLimiter.handleError(new Error('Rate limit exceeded'))
          continue
        }
        
        if (response.status === 503) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
          console.log(`Service unavailable, retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          retryCount++
          continue
        }

        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const content = await response.text()
      const wordCount = content
        .replace(/<[^>]*>/g, ' ') // Remove XML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .split(' ')
        .length

      return {
        content,
        wordCount
      }
    } catch (error) {
      lastError = error as Error
      if (retryCount === maxRetries - 1) {
        console.error(`Failed after ${maxRetries} retries:`, error)
        throw error
      }
      retryCount++
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
      console.log(`Error fetching title ${titleNumber}, retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}