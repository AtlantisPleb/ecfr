import { PrismaClient } from '@prisma/client'
import { fetchAgencies, fetchTitles, fetchTitleContent } from './api'
import { processTitle } from './processors/titleProcessor'
import { processAgency } from './processors/agencyProcessor'
import { saveCheckpoint, loadCheckpoint } from './checkpoint'
import { ProcessingProgress, ECFRAgency, ECFRTitle } from './types'

const prisma = new PrismaClient()

function formatProgress(current: number, total: number): string {
  const adjustedCurrent = Math.min(current, total)
  const percentage = Math.round((adjustedCurrent / total) * 100)
  const width = 50
  const filled = Math.round((width * adjustedCurrent) / total)
  const empty = Math.max(0, width - filled)
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${bar} ${percentage}% (${adjustedCurrent}/${total})`
}

async function processAgencyData(agency: ECFRAgency, titles: ECFRTitle[], progress: ProcessingProgress) {
  try {
    // Process agency and get its ID
    const agencyId = await processAgency(agency)

    // Process all titles referenced by this agency
    const agencyTitles = titles.filter(title => 
      agency.cfr_references?.some(ref => ref.title === title.number)
    )

    console.log(`\nProcessing agency: ${agency.name} (${agencyTitles.length} titles)`)

    for (const title of agencyTitles) {
      const titleKey = `${agency.slug}-${title.number}`
      if (progress.completed.includes(titleKey)) {
        continue
      }

      try {
        console.log(`\nFetching content for Title ${title.number}`)
        const content = await fetchTitleContent(title.number)
        if (!content) {
          console.log(`No content found for title ${title.number}, skipping`)
          continue
        }

        console.log(`Processing Title ${title.number}: ${title.name}`)
        const result = await processTitle(title, agencyId, content)

        if (result.success) {
          progress.completed.push(titleKey)
          await saveCheckpoint({
            lastAgencyId: agency.slug,
            lastTitleNumber: title.number,
            timestamp: new Date(),
            progress: {
              agenciesProcessed: progress.current,
              titlesProcessed: progress.completed.length
            }
          })
          console.log(`Title ${title.number} processed successfully`)
        } else {
          progress.failed.push(titleKey)
          console.error(`Failed to process title ${title.number}:`, result.error)
        }

        console.log(`Progress: ${formatProgress(progress.completed.length, progress.total)}`)
      } catch (error) {
        console.error(`Error processing title ${title.number}:`, error)
        progress.failed.push(titleKey)
      }
    }
  } catch (error) {
    console.error(`Error processing agency ${agency.name}:`, error)
    throw error
  }
}

export async function ingest() {
  console.log('Starting eCFR ingestion...')

  // Load checkpoint if exists
  const checkpoint = await loadCheckpoint()
  const progress: ProcessingProgress = {
    total: 0,
    current: checkpoint?.progress.agenciesProcessed ?? 0,
    completed: [],
    failed: []
  }

  try {
    // Fetch all agencies and titles first
    console.log('Fetching agencies and titles...')
    const [agencies, titles] = await Promise.all([
      fetchAgencies(),
      fetchTitles()
    ])

    // Calculate total number of agency-title relationships
    const totalRelationships = agencies.reduce((sum, agency) => 
      sum + (agency.cfr_references?.length || 0), 0
    )
    progress.total = totalRelationships

    console.log(`Found ${agencies.length} agencies and ${titles.length} titles`)
    console.log(`Total agency-title relationships to process: ${totalRelationships}`)

    // Process each agency and its titles
    for (const agency of agencies) {
      await processAgencyData(agency, titles, progress)
      progress.current++

      // Save overall progress
      console.log(`\nAgency Progress: ${formatProgress(progress.current, agencies.length)}`)
    }

    console.log('\nIngestion complete!')
    console.log(`Processed ${progress.completed.length} agency-title relationships`)
    if (progress.failed.length > 0) {
      console.log(`Failed to process ${progress.failed.length} relationships:`)
      console.log(progress.failed.join('\n'))
    }
  } catch (error) {
    console.error('Fatal error during ingestion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}