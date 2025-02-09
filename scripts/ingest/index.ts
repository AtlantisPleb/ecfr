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
    console.log('\n========================================')
    console.log(`Processing agency: ${agency.name}`)
    console.log('Agency details:', {
      slug: agency.slug,
      short_name: agency.short_name,
      cfr_references: agency.cfr_references?.length || 0
    })

    if (!agency.cfr_references?.length) {
      console.log('Skipping agency - no CFR references')
      return
    }

    // Process agency and get its ID
    console.log('\nCreating/updating agency record...')
    const agencyId = await processAgency(agency)
    console.log('Agency record ID:', agencyId)

    // Process all titles referenced by this agency
    const agencyTitles = titles.filter(title => 
      agency.cfr_references?.some(ref => ref.title === title.number)
    )

    console.log(`\nFound ${agencyTitles.length} titles referenced by agency:`)
    agencyTitles.forEach(title => {
      console.log(`- Title ${title.number}: ${title.name}`)
    })

    for (const title of agencyTitles) {
      const titleKey = `${agency.slug}-${title.number}`
      if (progress.completed.includes(titleKey)) {
        console.log(`\nSkipping already processed title: ${title.number}`)
        continue
      }

      try {
        console.log(`\n----------------------------------------`)
        console.log(`Processing Title ${title.number}: ${title.name}`)
        
        console.log('Fetching title content...')
        const content = await fetchTitleContent(title.number)
        if (!content) {
          console.log(`No content found for title ${title.number}, skipping`)
          continue
        }

        console.log('Content retrieved, processing...')
        console.log('Content summary:', {
          wordCount: content.wordCount,
          chapters: content.structure.chapters.length,
          references: content.references.length
        })

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
          console.log(`\nTitle ${title.number} processed successfully`)
          console.log('Title record:', result.data)
        } else {
          progress.failed.push(titleKey)
          console.error(`Failed to process title ${title.number}:`, result.error)
        }

        console.log(`\nOverall Progress: ${formatProgress(progress.completed.length, progress.total)}`)
      } catch (error) {
        console.error(`\nError processing title ${title.number}:`, error)
        if (error instanceof Error) {
          console.error('Stack:', error.stack)
        }
        progress.failed.push(titleKey)
      }
    }
  } catch (error) {
    console.error(`\nError processing agency ${agency.name}:`, error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
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
    console.log('\nFetching agencies and titles...')
    const [agencies, titles] = await Promise.all([
      fetchAgencies(),
      fetchTitles()
    ])

    // Log agency statistics
    const agenciesWithRefs = agencies.filter(a => a.cfr_references?.length > 0)
    console.log('\nAgency Statistics:')
    console.log(`- Total agencies: ${agencies.length}`)
    console.log(`- Agencies with CFR references: ${agenciesWithRefs.length}`)
    console.log(`- Agencies without references: ${agencies.length - agenciesWithRefs.length}`)

    // Calculate total number of agency-title relationships
    const totalRelationships = agencies.reduce((sum, agency) => 
      sum + (agency.cfr_references?.length || 0), 0
    )
    progress.total = totalRelationships

    console.log('\nTitle Statistics:')
    console.log(`- Total titles: ${titles.length}`)
    console.log(`- Total agency-title relationships to process: ${totalRelationships}`)

    // Process each agency and its titles
    for (const agency of agencies) {
      await processAgencyData(agency, titles, progress)
      progress.current++

      // Save overall progress
      console.log(`\nAgency Progress: ${formatProgress(progress.current, agencies.length)}`)
    }

    console.log('\n========================================')
    console.log('Ingestion complete!')
    console.log('Final Statistics:')
    console.log(`- Processed ${progress.completed.length}/${totalRelationships} agency-title relationships`)
    console.log(`- Processed ${progress.current}/${agencies.length} agencies`)
    
    if (progress.failed.length > 0) {
      console.log(`\nFailed Relationships (${progress.failed.length}):`)
      console.log(progress.failed.join('\n'))
    }
  } catch (error) {
    console.error('\nFatal error during ingestion:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}