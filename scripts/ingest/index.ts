import { PrismaClient } from '@prisma/client'
import { fetchAgencies, fetchTitles, fetchTitleContent } from './api.js'
import { loadCheckpoint, saveCheckpoint, shouldSkipAgency, shouldSkipTitle } from './checkpoint.js'
import { ECFRAgency, ECFRTitle, ProcessedContent } from './types.js'
import { calculateTextMetrics, extractReferences, compareVersions } from './analysis.js'

const prisma = new PrismaClient({
  log: ['error']
})

function formatProgress(current: number, total: number): string {
  // Ensure we don't exceed 100%
  const adjustedCurrent = Math.min(current, total)
  const percentage = Math.round((adjustedCurrent / total) * 100)
  const width = 50
  const filled = Math.round((width * adjustedCurrent) / total)
  const empty = Math.max(0, width - filled) // Ensure we don't get negative empty space
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${bar} ${percentage}% (${adjustedCurrent}/${total})`
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function generateSortableName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/i, '') // Remove leading "The"
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .trim()
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

    // First, ensure all titles exist
    console.log('Creating/updating titles...')
    for (const title of titles) {
      try {
        await prisma.title.upsert({
          where: { number: title.number },
          create: {
            id: `title-${title.number}`,
            number: title.number,
            name: title.name,
            type: 'CFR'
          },
          update: {
            name: title.name
          }
        })
      } catch (error) {
        console.error(`Error creating/updating title ${title.number}:`, error)
        throw error
      }
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

        console.log(`\nProcessing agency: ${agency.name}`)
        console.log(`Agency Progress: ${formatProgress(processedAgencies + 1, totalAgencies)}`)

        const displayName = agency.display_name || agency.name
        const slug = generateSlug(displayName)
        const sortableName = generateSortableName(displayName)

        // Create or update agency
        const dbAgency = await prisma.agency.upsert({
          where: { id: agency.slug },
          create: {
            id: agency.slug,
            name: agency.name,
            short_name: agency.short_name,
            display_name: displayName,
            sortable_name: sortableName,
            slug,
            parent_id: agency.parent_id
          },
          update: {
            name: agency.name,
            short_name: agency.short_name,
            display_name: displayName,
            sortable_name: sortableName,
            slug,
            parent_id: agency.parent_id
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
              // Cap the overall title progress at total titles
              console.log(`Overall Title Progress: ${formatProgress(Math.min(processedTitles + 1, totalTitles), totalTitles)}`)

              const result = await fetchTitleContent(title.number)
              if (!result) {
                agencyTitlesProcessed++
                continue
              }

              const { content, wordCount } = result

              // Connect agency to title (many-to-many)
              await prisma.agency.update({
                where: { id: dbAgency.id },
                data: {
                  titles: {
                    connect: { number: title.number }
                  }
                }
              }).catch(error => {
                console.error('Database error connecting agency to title:', error)
                throw error
              })

              // Check for changes
              const latestVersion = await prisma.version.findFirst({
                where: { titleId: `title-${title.number}` },
                orderBy: { date: 'desc' }
              }).catch(error => {
                console.error('Database error fetching latest version:', error)
                throw error
              })

              if (!latestVersion || latestVersion.content !== content) {
                // Calculate metrics
                const textMetrics = calculateTextMetrics(content)

                // Create new version with metrics
                const newVersion = await prisma.version.create({
                  data: {
                    titleId: `title-${title.number}`,
                    content,
                    wordCount,
                    date: new Date(),
                    changes: {
                      create: {
                        type: latestVersion ? 'MODIFY' : 'ADD',
                        section: 'full',
                        description: latestVersion ? 'Content updated' : 'Initial version'
                      }
                    },
                    textMetrics: {
                      create: textMetrics
                    }
                  }
                }).catch(error => {
                  console.error('Database error creating version:', error)
                  throw error
                })

                // Extract and create references using the new version's ID
                const references = extractReferences(content, newVersion.id)
                for (const ref of references) {
                  await prisma.reference.create({
                    data: {
                      sourceId: newVersion.id,
                      targetId: newVersion.id, // For now, reference itself
                      context: ref.context,
                      type: ref.type
                    }
                  }).catch(error => {
                    console.error('Database error creating reference:', error)
                    // Don't throw here, continue processing
                  })
                }

                // Calculate activity metrics if this is an update
                if (latestVersion) {
                  const diff = compareVersions(latestVersion.content, content)
                  await prisma.activityMetrics.create({
                    data: {
                      agencyId: dbAgency.id,
                      date: new Date(),
                      newContent: diff.wordCounts.added,
                      modifiedContent: diff.wordCounts.modified,
                      deletedContent: diff.wordCounts.deleted,
                      totalWords: wordCount
                    }
                  }).catch(error => {
                    console.error('Database error creating activity metrics:', error)
                    // Don't throw here, continue processing
                  })
                }

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
                  titlesProcessed: Math.min(processedTitles, totalTitles)
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
            titlesProcessed: Math.min(processedTitles, totalTitles)
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
    console.log(`Processed ${processedAgencies} agencies and ${Math.min(processedTitles, totalTitles)} titles`)
  } catch (error) {
    console.error('Fatal error during ingestion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}