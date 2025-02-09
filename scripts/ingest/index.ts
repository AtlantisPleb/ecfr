import { PrismaClient } from '@prisma/client'
import { fetchAgencies, fetchTitles, fetchTitleContent } from './api.js'
import { loadCheckpoint, saveCheckpoint, shouldSkipAgency, shouldSkipTitle, formatProgress } from './checkpoint.js'
import { ECFRAgency, ECFRTitle } from './types.js'

const prisma = new PrismaClient()

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error)
  process.exit(1)
})

async function processTitle(
  title: ECFRTitle,
  agencyId: string,
  totalTitles: number,
  processedTitles: number
): Promise<boolean> {
  console.log(`\nProcessing title ${title.number}: ${title.name}`)
  console.log(`Progress: ${formatProgress(processedTitles + 1, totalTitles)}`)
  
  try {
    const result = await fetchTitleContent(title.number)
    if (!result) {
      console.log(`Skipping title ${title.number} - content not available`)
      return false
    }
    
    const { content, wordCount } = result
    
    // Create or update title
    const dbTitle = await prisma.title.upsert({
      where: {
        id: `title-${title.number}`
      },
      create: {
        id: `title-${title.number}`,
        number: title.number,
        name: title.name,
        agencyId: agencyId
      },
      update: {
        name: title.name,
        agencyId: agencyId
      }
    })

    // Check if content has changed
    const latestVersion = await prisma.version.findFirst({
      where: { titleId: dbTitle.id },
      orderBy: { date: 'desc' }
    })

    if (!latestVersion || latestVersion.content !== content) {
      // Create new version
      const version = await prisma.version.create({
        data: {
          titleId: dbTitle.id,
          content,
          wordCount,
          date: new Date(),
          changes: {
            create: {
              type: latestVersion ? 'MODIFY' : 'ADD',
              section: 'full',
              description: latestVersion 
                ? 'Content updated' 
                : 'Initial version'
            }
          }
        }
      })

      // Update word count for agency
      await prisma.wordCount.create({
        data: {
          agencyId,
          count: wordCount,
          date: new Date()
        }
      })

      console.log(`Created new version for title ${title.number} with ${wordCount} words`)
    } else {
      console.log(`No changes for title ${title.number}`)
    }
    return true
  } catch (error) {
    console.error(`Error processing title ${title.number}:`, error)
    throw error
  }
}

async function processAgency(
  agency: ECFRAgency,
  titles: ECFRTitle[],
  checkpoint: Awaited<ReturnType<typeof loadCheckpoint>>,
  totalAgencies: number,
  processedAgencies: number,
  totalTitles: number,
  processedTitles: number
): Promise<void> {
  console.log(`\nProcessing agency: ${agency.name}`)
  console.log(`Agency Progress: ${formatProgress(processedAgencies + 1, totalAgencies)}`)

  try {
    // Create or update agency
    const dbAgency = await prisma.agency.upsert({
      where: { id: agency.slug },
      create: {
        id: agency.slug,
        name: agency.display_name
      },
      update: {
        name: agency.display_name
      }
    })

    // Process each title referenced by this agency
    for (const ref of agency.cfr_references) {
      const title = titles.find(t => t.number === ref.title)
      if (!title) {
        console.log(`Title ${ref.title} not found in titles list, skipping`)
        continue
      }

      if (await shouldSkipTitle(title.number, checkpoint)) {
        console.log(`Skipping already processed title ${title.number}`)
        processedTitles++
        continue
      }

      const success = await processTitle(title, dbAgency.id, totalTitles, processedTitles)
      if (success) {
        processedTitles++
      }
      
      await saveCheckpoint({
        lastAgencyId: agency.slug,
        lastTitleNumber: title.number,
        progress: {
          agenciesProcessed: processedAgencies,
          titlesProcessed: processedTitles
        }
      })
    }

    // Process child agencies if any
    for (const child of agency.children) {
      await processAgency(
        child,
        titles,
        checkpoint,
        totalAgencies,
        processedAgencies,
        totalTitles,
        processedTitles
      )
    }
  } catch (error) {
    console.error(`Error processing agency ${agency.name}:`, error)
    throw error
  }
}

async function ingestECFR() {
  console.log('Starting eCFR ingestion...')
  
  try {
    const checkpoint = await loadCheckpoint()
    console.log('Loaded checkpoint:', checkpoint)

    const [agencies, titles] = await Promise.all([
      fetchAgencies(),
      fetchTitles()
    ])

    if (!agencies?.length || !titles?.length) {
      console.error('Failed to fetch agencies or titles:', { agencies, titles })
      throw new Error('Invalid API response')
    }

    console.log(`Found ${agencies.length} agencies and ${titles.length} titles`)

    let processedAgencies = checkpoint?.progress.agenciesProcessed || 0
    let processedTitles = checkpoint?.progress.titlesProcessed || 0
    const totalAgencies = agencies.length
    const totalTitles = titles.length

    for (const agency of agencies) {
      if (!agency.slug) {
        console.warn('Agency missing slug:', agency)
        continue
      }

      if (await shouldSkipAgency(agency.slug, checkpoint, prisma)) {
        console.log(`Skipping already processed agency ${agency.name}`)
        processedAgencies++
        continue
      }

      await processAgency(
        agency, 
        titles, 
        checkpoint,
        totalAgencies,
        processedAgencies,
        totalTitles,
        processedTitles
      )
      
      processedAgencies++
      
      // Update checkpoint after each agency
      await saveCheckpoint({
        lastAgencyId: agency.slug,
        lastTitleNumber: null,
        progress: {
          agenciesProcessed: processedAgencies,
          titlesProcessed: processedTitles
        }
      })
    }

    console.log('\neCFR ingestion completed successfully')
    console.log(`Processed ${processedAgencies} agencies and ${processedTitles} titles`)
  } catch (error) {
    console.error('Error during ingestion:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
ingestECFR().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})