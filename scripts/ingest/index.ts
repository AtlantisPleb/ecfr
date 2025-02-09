import { PrismaClient } from '@prisma/client'
import { fetchAgencies, fetchTitles, fetchTitleContent } from './api'
import { processTitle } from './processors/titleProcessor'
import { processAgency } from './processors/agencyProcessor'
import { saveCheckpoint, loadCheckpoint } from './checkpoint'
import { ProcessingProgress } from './types'

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

async function processAgencyData(agency: any, progress: ProcessingProgress) {
  try {
    // Process agency and get its ID
    const agencyId = await processAgency(agency)
    const dbAgency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: { titles: true }
    })

    if (!dbAgency) {
      console.error(`Agency ${agencyId} not found after creation`)
      return
    }

    console.log(`\nProcessing agency: ${dbAgency.name}`)
  
    for (const title of dbAgency.titles) {
      if (progress.completed.includes(title.id)) {
        continue
      }

      try {
        const content = await fetchTitleContent(title.number)
        if (!content) {
          console.log(`No content found for title ${title.number}, skipping`)
          continue
        }

        const result = await processTitle(
          { 
            number: title.number,
            name: title.name,
            type: 'CFR',
            chapter_count: 0,
            last_updated: new Date().toISOString(),
            chapters: []
          },
          agencyId,
          content
        )

        if (result.success) {
          progress.completed.push(title.id)
          await saveCheckpoint({
            lastAgencyId: agency.slug,
            lastTitleNumber: title.number,
            timestamp: new Date(),
            progress: {
              agenciesProcessed: progress.current,
              titlesProcessed: progress.completed.length
            }
          })
        } else {
          progress.failed.push(title.id)
        }

        console.log(`Title ${title.number}: ${result.success ? 'Success' : 'Failed'}`)
        console.log(`Progress: ${formatProgress(progress.completed.length, progress.total)}`)
      } catch (error) {
        console.error(`Error processing title ${title.number}:`, error)
        progress.failed.push(title.id)
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
    // Fetch agencies and titles
    const [agencies, titles] = await Promise.all([
      fetchAgencies(),
      fetchTitles()
    ])

    console.log(`Found ${agencies.length} agencies and ${titles.length} titles`)

    // Process each agency
    for (const agency of agencies) {
      await processAgencyData(agency, progress)
      progress.current++
    }

    console.log('\nIngestion complete!')
    if (progress.failed.length > 0) {
      console.log(`Failed to process ${progress.failed.length} titles:`)
      console.log(progress.failed.join(', '))
    }
  } catch (error) {
    console.error('Fatal error during ingestion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}