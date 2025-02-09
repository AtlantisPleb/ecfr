import { PrismaClient } from '@prisma/client'
import { fetchAgencies, fetchTitles, fetchTitleContent } from './api'
import { loadCheckpoint, saveCheckpoint, shouldSkipAgency, shouldSkipTitle } from './checkpoint'
import { ECFRAgency, ECFRTitle } from './types'

const prisma = new PrismaClient()

async function processTitle(
  title: ECFRTitle,
  agencyId: string
): Promise<void> {
  console.log(`Processing title ${title.number}: ${title.name}`)
  
  try {
    const { content, wordCount } = await fetchTitleContent(title.number)
    
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
  } catch (error) {
    console.error(`Error processing title ${title.number}:`, error)
    throw error
  }
}

async function processAgency(
  agency: ECFRAgency,
  titles: ECFRTitle[],
  checkpoint: Awaited<ReturnType<typeof loadCheckpoint>>
): Promise<void> {
  console.log(`Processing agency: ${agency.name}`)

  try {
    // Create or update agency
    const dbAgency = await prisma.agency.upsert({
      where: { id: agency.id },
      create: {
        id: agency.id,
        name: agency.name
      },
      update: {
        name: agency.name
      }
    })

    // Process each title for this agency
    for (const chapter of agency.chapters) {
      const title = titles.find(t => t.number === chapter.title)
      if (!title) continue

      if (await shouldSkipTitle(title.number, checkpoint)) {
        console.log(`Skipping already processed title ${title.number}`)
        continue
      }

      await processTitle(title, dbAgency.id)
      
      await saveCheckpoint({
        lastAgencyId: agency.id,
        lastTitleNumber: title.number,
        progress: {
          agenciesProcessed: checkpoint?.progress.agenciesProcessed || 0,
          titlesProcessed: (checkpoint?.progress.titlesProcessed || 0) + 1
        }
      })
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

    console.log(`Found ${agencies.length} agencies and ${titles.length} titles`)

    for (const agency of agencies) {
      if (await shouldSkipAgency(agency.id, checkpoint, prisma)) {
        console.log(`Skipping already processed agency ${agency.name}`)
        continue
      }

      await processAgency(agency, titles, checkpoint)
      
      // Update checkpoint after each agency
      await saveCheckpoint({
        lastAgencyId: agency.id,
        lastTitleNumber: null,
        progress: {
          agenciesProcessed: (checkpoint?.progress.agenciesProcessed || 0) + 1,
          titlesProcessed: checkpoint?.progress.titlesProcessed || 0
        }
      })
    }

    console.log('eCFR ingestion completed successfully')
  } catch (error) {
    console.error('Error during ingestion:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
ingestECFR()