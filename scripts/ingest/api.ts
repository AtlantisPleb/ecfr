import { calculateTextMetrics, extractReferences } from "./analysis.js"
import { RateLimiter } from "./rateLimiter.js"
import {
  ECFRAgency, ECFRChapter, ECFRPart, ECFRSection, ECFRSubpart, ECFRTitle,
  ProcessedContent
} from "./types.js"

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
          console.log(`Service unavailable, retrying in ${delay / 1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)
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
      console.log(`Error fetching ${url}, retrying in ${delay / 1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)
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
  console.log('\nParsing structure from API response...')
  const chapters: ECFRChapter[] = []

  // The root node is the title, its direct children are chapters
  const chapterNodes = contentObj.children || []
  console.log(`Found ${chapterNodes.length} top-level nodes`)

  // Convert Roman numeral to number
  function romanToNumber(roman: string): number {
    const romanValues: { [key: string]: number } = {
      'I': 1, 'V': 5, 'X': 10, 'L': 50,
      'C': 100, 'D': 500, 'M': 1000
    }

    let result = 0
    for (let i = 0; i < roman.length; i++) {
      const current = romanValues[roman[i]]
      const next = romanValues[roman[i + 1]]
      if (next > current) {
        result += next - current
        i++
      } else {
        result += current
      }
    }
    return result
  }

  for (const node of chapterNodes) {
    // Only process chapter nodes
    if (!node.label?.includes('Chapter')) {
      console.log(`Skipping non-chapter node: ${node.label}`)
      continue
    }

    // Skip reserved chapters
    if (node.label?.includes('[Reserved]')) {
      console.log(`Skipping reserved chapter: ${node.label}`)
      continue
    }

    console.log(`\nParsing Chapter ${node.label}`)

    // Extract Roman numeral from "Chapter I—" or "Chapter I " format
    const romanMatch = node.label.match(/Chapter\s+([IVXLCDM]+)(?:—|\s|$)/)
    if (!romanMatch) {
      console.log(`Could not parse chapter number from: ${node.label}`)
      continue
    }

    const chapterNum = romanToNumber(romanMatch[1])
    console.log(`Parsed chapter number ${chapterNum} from ${romanMatch[1]}`)

    const chapter: ECFRChapter = {
      number: chapterNum,
      name: node.label_description || node.label,
      parts: []
    }

    // Process parts within the chapter
    const partNodes = node.children || []
    console.log(`Found ${partNodes.length} nodes in chapter ${chapter.number}`)

    for (const partNode of partNodes) {
      // Only process part nodes
      if (!partNode.label?.toLowerCase().startsWith('part')) {
        console.log(`Skipping non-part node: ${partNode.label}`)
        continue
      }

      console.log(`Parsing Part ${partNode.label}`)
      const partMatch = partNode.label.match(/Part\s+(\d+)/)
      if (!partMatch) {
        console.log(`Could not parse part number from: ${partNode.label}`)
        continue
      }

      const part: ECFRPart = {
        number: parseInt(partMatch[1]),
        name: partNode.label_description || partNode.label,
        subparts: []
      }

      // Process subparts within the part
      const subpartNodes = partNode.children || []
      console.log(`Found ${subpartNodes.length} nodes in part ${part.number}`)

      for (const subpartNode of subpartNodes) {
        // Only process subpart nodes
        if (!subpartNode.label?.toLowerCase().startsWith('subpart')) {
          console.log(`Skipping non-subpart node: ${subpartNode.label}`)
          continue
        }

        console.log(`Parsing Subpart: ${subpartNode.label}`)
        const subpart: ECFRSubpart = {
          name: subpartNode.label_description || subpartNode.label,
          sections: []
        }

        // Process sections within the subpart
        const sectionNodes = subpartNode.children || []
        console.log(`Found ${sectionNodes.length} nodes in subpart ${subpart.name}`)

        for (const sectionNode of sectionNodes) {
          // Only process section nodes
          if (!sectionNode.label?.includes('§')) {
            console.log(`Skipping non-section node: ${sectionNode.label}`)
            continue
          }

          console.log(`Parsing Section ${sectionNode.label}`)
          const sectionMatch = sectionNode.label.match(/§\s*(\d+\.\d+)/)
          if (!sectionMatch) {
            console.log(`Could not parse section number from: ${sectionNode.label}`)
            continue
          }

          const section: ECFRSection = {
            number: sectionMatch[1],
            name: sectionNode.label_description || sectionNode.label,
            content: sectionNode.content || ''
          }
          subpart.sections.push(section)
        }

        part.subparts.push(subpart)
      }

      chapter.parts.push(part)
    }

    chapters.push(chapter)
  }

  console.log('\nStructure parsing complete')
  console.log('Summary:')
  console.log(`- ${chapters.length} chapters`)
  console.log(`- ${chapters.reduce((sum, ch) => sum + ch.parts.length, 0)} parts`)
  console.log(`- ${chapters.reduce((sum, ch) =>
    sum + ch.parts.reduce((psum, p) => psum + p.subparts.length, 0), 0)} subparts`)
  console.log(`- ${chapters.reduce((sum, ch) =>
    sum + ch.parts.reduce((psum, p) =>
      psum + p.subparts.reduce((ssum, s) => ssum + s.sections.length, 0), 0), 0)} sections`)

  return { chapters }
}

export async function fetchTitleContent(titleNumber: number, date: string = 'latest'): Promise<ProcessedContent | null> {
  try {
    // First get the versions info for this title
    console.log(`\nFetching versions data for Title ${titleNumber}...`)
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
    console.log(`Latest amendment date: ${latestDate}`)

    // Get the content using the structure endpoint
    console.log(`Fetching structure data for Title ${titleNumber}...`)
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
            console.log(`Service unavailable, retrying in ${delay / 1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            retryCount++
            continue
          }

          const text = await response.text()
          throw new APIError(`HTTP error! status: ${response.status}`, response.status, true)
        }

        const content = await response.text()
        const contentObj = JSON.parse(content)

        console.log('Parsing content...')

        // Extract all text content for metrics
        const allText = JSON.stringify(contentObj, null, 2)
        const wordCount = allText
          .replace(/"[^"]*"/g, ' ') // Remove JSON strings
          .replace(/[{}\[\],]/g, ' ') // Remove JSON syntax
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          .split(/\s+/)
          .length

        console.log(`Word count: ${wordCount}`)

        // Calculate metrics and extract references
        console.log('Calculating metrics...')
        const textMetrics = calculateTextMetrics(allText)
        console.log('Extracting references...')
        const references = extractReferences(allText, titleNumber.toString())

        // Parse hierarchical structure
        console.log('Parsing structure...')
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
        console.log(`Error fetching title ${titleNumber}, retrying in ${delay / 1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)
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
