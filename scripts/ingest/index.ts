import { PrismaClient } from '@prisma/client'
import { fetchAgencies, fetchTitles, fetchTitleContent } from './api.js'
import { loadCheckpoint, saveCheckpoint, shouldSkipAgency, shouldSkipTitle, formatProgress } from './checkpoint.js'
import { ECFRAgency, ECFRTitle } from './types.js'

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('=== Unhandled Rejection ===')
  console.error('Promise:', promise)
  console.error('Reason:', reason)
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack)
  } else {
    console.error('Full reason object:', JSON.stringify(reason, null, 2))
  }
  process.exit(1)
})

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('=== Uncaught Exception ===')
  console.error('Error:', error)
  console.error('Stack:', error.stack)
  process.exit(1)
})

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

async function main() {
  try {
    console.log('Starting eCFR ingestion...')
    
    // Test database connection
    try {
      await prisma.$connect()
      console.log('Database connection successful')
    } catch (error) {
      console.error('Database connection failed:', error)
      throw error
    }

    // Load checkpoint
    let checkpoint
    try {
      checkpoint = await loadCheckpoint()
      console.log('Loaded checkpoint:', checkpoint)
    } catch (error) {
      console.error('Failed to load checkpoint:', error)
      throw error
    }

    // Fetch initial data
    let agencies: ECFRAgency[] = []
    let titles: ECFRTitle[] = []

    try {
      console.log('Fetching agencies...')
      agencies = await fetchAgencies()
      console.log('Fetching titles...')
      titles = await fetchTitles()
    } catch (error) {
      console.error('Failed to fetch initial data:', error)
      if (error instanceof Error) {
        console.error('Error stack:', error.stack)
      }
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

    // Process agencies
    for (const agency of agencies) {
      try {
        if (!agency.slug) {
          console.warn('Agency missing slug:', JSON.stringify(agency, null, 2))
          continue
        }

        if (await shouldSkipAgency(agency.slug, checkpoint, prisma)) {
          console.log(`Skipping already processed agency ${agency.name}`)
          processedAgencies++
          continue
        }

        console.log(`\nProcessing agency: ${agency.name}`)
        console.log(`Agency Progress: ${formatProgress(processedAgencies + 1, totalAgencies)}`)

        // Create or update agency
        const dbAgency = await prisma.agency.upsert({
          where: { id: agency.slug },
          create: {
            id: agency.slug,
            name: agency.display_name || agency.name
          },
          update: {
            name: agency.display_name || agency.name
          }
        }).catch(error => {
          console.error('Database error creating/updating agency:', error)
          throw error
        })

        // Process titles
        if (Array.isArray(agency.cfr_references)) {
          for (const ref of agency.cfr_references) {
            try {
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

              console.log(`Processing title ${title.number}: ${title.name}`)
              console.log(`Progress: ${formatProgress(processedTitles + 1, totalTitles)}`)

              const result = await fetchTitleContent(title.number)
              if (!result) {
                console.log(`No content available for title ${title.number}, skipping`)
                continue
              }

              const { content, wordCount } = result

              // Create or update title
              const dbTitle = await prisma.title.upsert({
                where: { id: `title-${title.number}` },
                create: {
                  id: `title-${title.number}`,
                  number: title.number,
                  name: title.name,
                  agencyId: dbAgency.id
                },
                update: {
                  name: title.name,
                  agencyId: dbAgency.id
                }
              }).catch(error => {
                console.error('Database error creating/updating title:', error)
                throw error
              })

              // Check for changes
              const latestVersion = await prisma.version.findFirst({
                where: { titleId: dbTitle.id },
                orderBy: { date: 'desc' }
              }).catch(error => {
                console.error('Database error fetching latest version:', error)
                throw error
              })

              if (!latestVersion || latestVersion.content !== content) {
                await prisma.version.create({
                  data: {
                    titleId: dbTitle.id,
                    content,
                    wordCount,
                    date: new Date(),
                    changes: {
                      create: {
                        type: latestVersion ? 'MODIFY' : 'ADD',
                        section: 'full',
                        description: latestVersion ? 'Content updated' : 'Initial version'
                      }
                    }
                  }
                }).catch(error => {
                  console.error('Database error creating version:', error)
                  throw error
                })

                await prisma.wordCount.create({
                  data: {
                    agencyId: dbAgency.id,
                    count: wordCount,
                    date: new Date()
                  }
                }).catch(error => {
                  console.error('Database error creating word count:', error)
                  throw error
                })

                console.log(`Created new version for title ${title.number} with ${wordCount} words`)
              } else {
                console.log(`No changes for title ${title.number}`)
              }

              processedTitles++
              
              // Save progress
              await saveCheckpoint({
                lastAgencyId: agency.slug,
                lastTitleNumber: title.number,
                progress: {
                  agenciesProcessed: processedAgencies,
                  titlesProcessed: processedTitles
                }
              }).catch(error => {
                console.error('Error saving checkpoint:', error)
                throw error
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
            titlesProcessed: processedTitles
          }
        }).catch(error => {
          console.error('Error saving agency checkpoint:', error)
          throw error
        })
      } catch (error) {
        console.error(`Error processing agency ${agency.name}:`, error)
        throw error
      }
    }

    console.log('\neCFR ingestion completed successfully')
    console.log(`Processed ${processedAgencies} agencies and ${processedTitles} titles`)
  } catch (error) {
    console.error('Fatal error during ingestion:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run with proper error handling
main().catch(error => {
  console.error('Script failed with error:', error)
  if (error instanceof Error) {
    console.error('Error stack:', error.stack)
  } else {
    console.error('Full error object:', JSON.stringify(error, null, 2))
  }
  process.exit(1)
})