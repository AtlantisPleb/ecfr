import { ECFRAgency, ECFRTitle, ProcessedContent } from './types.js'
import { RateLimiter } from './rateLimiter.js'

const BASE_URL = 'https://www.ecfr.gov/api'
const rateLimiter = new RateLimiter()

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public shouldRetry: boolean = false
  ) {
    super(message)
    this.name = 'APIError'
  }
}

async function fetchWithRetry(url: string, maxRetries = 5): Promise<any> {
  let retryCount = 0
  let lastError: Error | null = null

  while (retryCount < maxRetries) {
    try {
      await rateLimiter.waitForNext()
      console.log(`Fetching ${url}`)
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new APIError('Not found', 404, false)
        }
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
        throw new APIError(`HTTP error! status: ${response.status}`, response.status, true)
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof APIError && !error.shouldRetry) {
        throw error
      }

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
  console.log('Fetching agencies list...')
  const data = await fetchWithRetry(`${BASE_URL}/agencies.json`)
  return data.agencies
}

export async function fetchTitles(): Promise<ECFRTitle[]> {
  console.log('Fetching titles list...')
  const data = await fetchWithRetry(`${BASE_URL}/titles.json`)
  return data.titles
}

export async function fetchTitleContent(titleNumber: number, date: string = 'current'): Promise<ProcessedContent | null> {
  // The correct format is /api/structured/title-{number}/{date}
  const url = `${BASE_URL}/structured/title-${titleNumber}/${date}`
  console.log(`Fetching content for Title ${titleNumber}...`)
  
  try {
    let retryCount = 0
    const maxRetries = 5

    while (retryCount < maxRetries) {
      try {
        await rateLimiter.waitForNext()
        const response = await fetch(url)
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`Title ${titleNumber} not found (404), skipping`)
            return null
          }
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
          throw new APIError(`HTTP error! status: ${response.status}`, response.status, true)
        }

        const data = await response.json()
        const content = JSON.stringify(data) // Store the structured data as JSON
        const wordCount = countWords(data)

        console.log(`Successfully fetched Title ${titleNumber} (${wordCount} words)`)
        return {
          content,
          wordCount
        }
      } catch (error) {
        if (error instanceof APIError && !error.shouldRetry) {
          throw error
        }
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
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return null
    }
    throw error
  }

  throw new Error('Max retries exceeded')
}

function countWords(obj: any): number {
  let count = 0
  
  if (typeof obj === 'string') {
    return obj.trim().split(/\s+/).length
  }
  
  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countWords(item), 0)
  }
  
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).reduce((sum, value) => sum + countWords(value), 0)
  }
  
  return 0
}