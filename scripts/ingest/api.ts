import { ECFRAgency, ECFRTitle, ProcessedContent } from './types.js'
import { RateLimiter } from './rateLimiter.js'

const BASE_URL = 'https://www.ecfr.gov'
const API_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'ecfr-data-ingest/1.0',
}

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

function formatProgress(current: number, total: number): string {
  const percentage = Math.round((current / total) * 100)
  const width = 50
  const filled = Math.round((width * current) / total)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${bar} ${percentage}% (${current}/${total})`
}

async function fetchWithRetry(url: string, maxRetries = 5): Promise<any> {
  let retryCount = 0
  let lastError: Error | null = null
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  while (retryCount < maxRetries) {
    try {
      await rateLimiter.waitForNext()
      const response = await fetch(fullUrl, {
        headers: API_HEADERS,
        redirect: 'follow'
      })
      
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
          throw new Error('Invalid JSON response')
        }
      }
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
  try {
    console.log('Fetching agencies list...')
    const data = await fetchWithRetry('/api/admin/v1/agencies.json')
    return data.agencies || []
  } catch (error) {
    console.error('Error fetching agencies:', error)
    throw error
  }
}

async function fetchTitlesPage(page: number = 1): Promise<any> {
  return await fetchWithRetry(`/api/versioner/v1/titles.json?page=${page}`)
}

export async function fetchTitles(): Promise<ECFRTitle[]> {
  try {
    console.log('Fetching titles list...')
    let allTitles: ECFRTitle[] = []
    let currentPage = 1
    let hasMorePages = true

    while (hasMorePages) {
      console.log(`Fetching titles page ${currentPage}...`)
      const data = await fetchTitlesPage(currentPage)
      
      if (!data.titles) {
        console.error('No titles array in response:', data)
        break
      }

      allTitles = allTitles.concat(data.titles)

      // Check if there are more pages
      // This logic might need to be adjusted based on the actual API response
      if (data.meta?.next_page) {
        currentPage = data.meta.next_page
      } else if (data.meta?.has_more) {
        currentPage++
      } else {
        hasMorePages = false
      }

      // If we've fetched all titles (1-50), stop
      const highestTitleNumber = Math.max(...allTitles.map(t => t.number))
      if (highestTitleNumber >= 50) {
        hasMorePages = false
      }
    }

    // Sort titles by number to ensure consistent order
    allTitles.sort((a, b) => a.number - b.number)
    
    return allTitles
  } catch (error) {
    console.error('Error fetching titles:', error)
    throw error
  }
}

export async function fetchTitleContent(titleNumber: number, date: string = 'latest'): Promise<ProcessedContent | null> {
  try {
    // First get the versions info for this title
    const versionsData = await fetchWithRetry(`/api/versioner/v1/versions/title-${titleNumber}.json`)
    if (!versionsData || !versionsData.content_versions) {
      console.log(`No versions data found for title ${titleNumber}, skipping`)
      return null
    }

    // Get the latest version date from meta
    const latestDate = versionsData.meta?.latest_amendment_date
    if (!latestDate) {
      console.log(`No valid version date found for title ${titleNumber}, skipping`)
      return null
    }

    // Get the content using the structure endpoint
    const url = `/api/versioner/v1/structure/${latestDate}/title-${titleNumber}.json`
    
    let retryCount = 0
    const maxRetries = 5

    while (retryCount < maxRetries) {
      try {
        await rateLimiter.waitForNext()
        const response = await fetch(`${BASE_URL}${url}`, {
          headers: API_HEADERS,
          redirect: 'follow'
        })
        
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
          throw new APIError(`HTTP error! status: ${response.status}`, response.status, true)
        }

        const content = await response.text()
        
        // For JSON content, we'll count words in the text fields
        const contentObj = JSON.parse(content)
        const allText = JSON.stringify(contentObj, null, 2)
        const wordCount = allText
          .replace(/"[^"]*"/g, ' ') // Remove JSON strings
          .replace(/[{}\[\],]/g, ' ') // Remove JSON syntax
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          .split(/\s+/)
          .length

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
    console.error(`Error fetching title ${titleNumber}:`, error)
    if (error instanceof APIError && error.status === 404) {
      return null
    }
    throw error
  }

  throw new Error('Max retries exceeded')
}