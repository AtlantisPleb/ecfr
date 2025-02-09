import { ECFRAgency, ECFRTitle, ProcessedContent } from './types.js'
import { RateLimiter } from './rateLimiter.js'

const ADMIN_BASE_URL = 'https://www.ecfr.gov/api/admin/v1'
const VERSIONER_BASE_URL = 'https://www.ecfr.gov/api/versioner/v1'
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

        const text = await response.text()
        console.error(`Error response body:`, text)
        throw new APIError(`HTTP error! status: ${response.status}`, response.status, true)
      }
      
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      } else {
        const text = await response.text()
        try {
          return JSON.parse(text)
        } catch (e) {
          if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
            return text // Return raw XML content
          }
          console.error('Failed to parse response as JSON:', text.slice(0, 200) + '...')
          throw new Error('Invalid JSON response')
        }
      }
    } catch (error) {
      console.error('Error details:', error)
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
  try {
    console.log('Fetching agencies list...')
    const data = await fetchWithRetry(`${ADMIN_BASE_URL}/agencies.json`)
    console.log('Raw agencies response:', JSON.stringify(data, null, 2))
    return data.agencies || []
  } catch (error) {
    console.error('Error fetching agencies:', error)
    throw error
  }
}

export async function fetchTitles(): Promise<ECFRTitle[]> {
  try {
    console.log('Fetching titles list...')
    const data = await fetchWithRetry(`${VERSIONER_BASE_URL}/titles.json`)
    console.log('Raw titles response:', JSON.stringify(data, null, 2))
    return data.titles || []
  } catch (error) {
    console.error('Error fetching titles:', error)
    throw error
  }
}

export async function fetchTitleContent(titleNumber: number, date: string = 'current'): Promise<ProcessedContent | null> {
  const url = `${VERSIONER_BASE_URL}/full/${date}/title-${titleNumber}.xml`
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
          
          const text = await response.text()
          console.error(`Error response body:`, text)
          throw new APIError(`HTTP error! status: ${response.status}`, response.status, true)
        }

        const content = await response.text()
        const wordCount = content
          .replace(/<[^>]*>/g, ' ') // Remove XML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          .split(/\s+/)
          .length

        console.log(`Successfully fetched Title ${titleNumber} (${wordCount} words)`)
        return {
          content,
          wordCount
        }
      } catch (error) {
        console.error(`Error details for title ${titleNumber}:`, error)
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
    console.error(`Error fetching title ${titleNumber}:`, error)
    if (error instanceof APIError && error.status === 404) {
      return null
    }
    throw error
  }

  throw new Error('Max retries exceeded')
}