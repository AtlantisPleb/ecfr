import { PrismaClient } from '@prisma/client'
import { fetchAgencies, fetchTitles, fetchTitleContent } from './api.js'
import { loadCheckpoint, saveCheckpoint, shouldSkipAgency, shouldSkipTitle } from './checkpoint.js'
import { ECFRAgency, ECFRTitle } from './types.js'

const prisma = new PrismaClient({
  log: ['error']
})

function formatProgress(current: number, total: number): string {
  const percentage = Math.round((current / total) * 100)
  const width = 50
  const filled = Math.round((width * current) / total)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${bar} ${percentage}% (${current}/${total})`
}

export async function main() {
  try {
    console.log('Starting eCFR ingestion...')
    
    // Test database connection
    try {
      await prisma.$connect()
    } catch (error) {
      console.error('Database connection failed:', error)
      throw error
    }

    // Load checkpoint
    let checkpoint = await loadCheckpoint()

    // Fetch initial data
    let agencies: ECFRAgency[] = []
    let titles: ECFRTitle[] = []

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
              console.log(`Overall Title Progress: ${formatProgress(processedTitles + 1, totalTitles)}`)

              const result = await fetchTitleContent(title.number)
              if (!result) {
                agencyTitlesProcessed++
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
              }

              processedTitles++
              agencyTitlesProcessed++
              
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
    throw error
  } finally {
    await prisma.$disconnect()
  }
}