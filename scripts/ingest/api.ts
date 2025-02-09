import { ECFRAgency, ECFRTitle, ProcessedContent } from './types'
import { RateLimiter } from './rateLimiter'

const BASE_URL = 'https://www.ecfr.gov/api'
const rateLimiter = new RateLimiter()

async function fetchWithRetry(url: string): Promise<any> {
  try {
    await rateLimiter.waitForNext()
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 429) {
        rateLimiter.handleError(new Error('Rate limit exceeded'))
        return fetchWithRetry(url)
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    throw error
  }
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
  
  await rateLimiter.waitForNext()
  const response = await fetch(url)
  
  if (!response.ok) {
    if (response.status === 429) {
      rateLimiter.handleError(new Error('Rate limit exceeded'))
      return fetchTitleContent(titleNumber, date)
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
}