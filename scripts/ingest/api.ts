import { ECFRAgency, ECFRTitle, ProcessedContent, ECFRChapter, ECFRPart, ECFRSubpart, ECFRSection } from './types.js'
import { RateLimiter } from './rateLimiter.js'
import { calculateTextMetrics, extractReferences } from './analysis.js'

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
    const data = await fetchWithRetry('/api/admin/v1/agencies.json')
    return data.agencies || []
  } catch (error) {
    console.error('Error fetching agencies:', error)
    throw error
  }
}

export async function fetchTitles(): Promise<ECFRTitle[]> {
  try {
    const data = await fetchWithRetry('/api/versioner/v1/titles.json')
    
    if (!data.titles) {
      console.error('No titles array in response:', data)
      return []
    }

    // Sort titles by number to ensure consistent order
    const titles = [...data.titles]
    titles.sort((a, b) => a.number - b.number)
    
    return titles
  } catch (error) {
    console.error('Error fetching titles:', error)
    throw error
  }
}

function parseStructure(contentObj: any): { chapters: ECFRChapter[] } {
  const chapters: ECFRChapter[] = []

  if (contentObj.structure?.chapters) {
    for (const chapterData of contentObj.structure.chapters) {
      const chapter: ECFRChapter = {
        number: parseInt(chapterData.number),
        name: chapterData.name,
        parts: []
      }

      if (chapterData.parts) {
        for (const partData of chapterData.parts) {
          const part: ECFRPart = {
            number: parseInt(partData.number),
            name: partData.name,
            subparts: []
          }

          if (partData.subparts) {
            for (const subpartData of partData.subparts) {
              const subpart: ECFRSubpart = {
                name: subpartData.name,
                sections: []
              }

              if (subpartData.sections) {
                for (const sectionData of subpartData.sections) {
                  const section: ECFRSection = {
                    number: sectionData.number,
                    name: sectionData.name,
                    content: sectionData.content || ''
                  }
                  subpart.sections.push(section)
                }
              }

              part.subparts.push(subpart)
            }
          }

          chapter.parts.push(part)
        }
      }

      chapters.push(chapter)
    }
  }

  return { chapters }
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
        const contentObj = JSON.parse(content)
        
        // Extract all text content for metrics
        const allText = JSON.stringify(contentObj, null, 2)
        const wordCount = allText
          .replace(/"[^"]*"/g, ' ') // Remove JSON strings
          .replace(/[{}\[\],]/g, ' ') // Remove JSON syntax
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          .split(/\s+/)
          .length

        // Calculate metrics and extract references
        const textMetrics = calculateTextMetrics(allText)
        const references = extractReferences(allText, titleNumber.toString())

        // Parse hierarchical structure
        const structure = parseStructure(contentObj)

        return {
          content,
          wordCount,
          textMetrics,
          references,
          structure
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

export async function fetchChapter(titleNumber: number, chapterNumber: number): Promise<ECFRChapter | null> {
  try {
    const url = `/api/versioner/v1/structure/latest/title-${titleNumber}/chapter-${chapterNumber}.json`
    const data = await fetchWithRetry(url)
    if (!data || !data.chapter) {
      return null
    }
    return data.chapter
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function fetchPart(titleNumber: number, partNumber: number): Promise<ECFRPart | null> {
  try {
    const url = `/api/versioner/v1/structure/latest/title-${titleNumber}/part-${partNumber}.json`
    const data = await fetchWithRetry(url)
    if (!data || !data.part) {
      return null
    }
    return data.part
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function fetchSection(titleNumber: number, sectionNumber: string): Promise<ECFRSection | null> {
  try {
    const url = `/api/versioner/v1/structure/latest/title-${titleNumber}/section-${sectionNumber}.json`
    const data = await fetchWithRetry(url)
    if (!data || !data.section) {
      return null
    }
    return data.section
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return null
    }
    throw error
  }
}