import { connectDB, disconnectDB, prisma } from './processors/db'
import { processAgency } from './processors/agencyProcessor'
import { ensureTitleExists, processTitleContent } from './processors/titleProcessor'
import { fetchAgencies, fetchTitles } from './api'
import { loadCheckpoint, saveCheckpoint, shouldSkipAgency, shouldSkipTitle } from './checkpoint'

export async function main() {
  try {
    console.log('Starting eCFR ingestion...')

    // Connect to database
    await connectDB()

    // Load checkpoint
    let checkpoint = await loadCheckpoint()

    // Fetch initial data
    let agencies = []
    let titles = []

    try {
      agencies = await fetchAgencies()
      titles = await fetchTitles()
    } catch (error) {
      console.error('Failed to fetch initial data:', error)
      throw error
    }

    // Validate response data
    if (!Array.isArray(agencies) || !Array.isArray(titles)) {
      console.error('Invalid API response:', { agencies, titles })
      throw new Error('Invalid API response format')
    }

    console.log(`Found ${agencies.length} agencies and ${titles.length} titles`)

    let processedAgencies = checkpoint?.progress.agenciesProcessed || 0
    let processedTitles = checkpoint?.progress.titlesProcessed || 0
    const totalAgencies = agencies.length
    const totalTitles = titles.length

    // First, ensure all titles exist
    console.log('Creating/updating titles...')
    for (const title of titles) {
      await ensureTitleExists(prisma, title)
    }
    console.log('Titles created/updated successfully')

    // Process agencies
    for (const agency of agencies) {
      try {
        if (!agency.slug) {
          console.warn('Agency missing slug:', agency.name)
          continue
        }

        if (await shouldSkipAgency(agency.slug, checkpoint, prisma)) {
          processedAgencies++
          continue
        }

        console.log(`\\nProcessing agency: ${agency.name}`)
        console.log(`Agency Progress: ${formatProgress(processedAgencies + 1, totalAgencies)}`)

        // Process agency and get its ID
        const agencyId = await processAgency(prisma, agency)

        // Process titles for this agency
        let agencyTitlesProcessed = 0
        const agencyTitlesTotal = agency.cfr_references?.length || 0

        if (Array.isArray(agency.cfr_references)) {
          for (const ref of agency.cfr_references) {
            try {
              const title = titles.find(t => t.number === ref.title)
              if (!title) {
                agencyTitlesProcessed++
                continue
              }

              if (await shouldSkipTitle(title.number, checkpoint)) {
                processedTitles++
                agencyTitlesProcessed++
                continue
              }

              console.log(`Processing Title ${title.number}: ${title.name}`)
              console.log(`Title Progress for ${agency.name}: ${formatProgress(agencyTitlesProcessed + 1, agencyTitlesTotal)}`)
              console.log(`Overall Title Progress: ${formatProgress(Math.min(processedTitles + 1, totalTitles), totalTitles)}`)

              // Process title content
              await processTitleContent(prisma, title.number, agencyId)

              processedTitles++
              agencyTitlesProcessed++

              // Save progress
              await saveCheckpoint({
                lastAgencyId: agency.slug,
                lastTitleNumber: title.number,
                progress: {
                  agenciesProcessed: processedAgencies,
                  titlesProcessed: Math.min(processedTitles, totalTitles)
                }
              })
            } catch (error) {
              console.error(`Error processing title ${ref.title}:`, error)
              throw error
            }
          }
        }

        processedAgencies++

        // Save agency checkpoint
        await saveCheckpoint({
          lastAgencyId: agency.slug,
          lastTitleNumber: null,
          progress: {
            agenciesProcessed: processedAgencies,
            titlesProcessed: Math.min(processedTitles, totalTitles)
          }
        })
      } catch (error) {
        console.error(`Error processing agency ${agency.name}:`, error)
        throw error
      }
    }

    console.log('\\neCFR ingestion completed successfully')
    console.log(`Processed ${processedAgencies} agencies and ${Math.min(processedTitles, totalTitles)} titles`)
  } catch (error) {
    console.error('Fatal error during ingestion:', error)
    throw error
  } finally {
    await disconnectDB()
  }
}

function formatProgress(current: number, total: number): string {
  const adjustedCurrent = Math.min(current, total)
  const percentage = Math.round((adjustedCurrent / total) * 100)
  const width = 50
  const filled = Math.round((width * adjustedCurrent) / total)
  const empty = Math.max(0, width - filled)
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${bar} ${percentage}% (${adjustedCurrent}/${total})`
}