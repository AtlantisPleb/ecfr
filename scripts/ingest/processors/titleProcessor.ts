import { PrismaClient, Title } from '@prisma/client'
import { ECFRTitle, ProcessedContent, TitleProcessingResult } from '../types'
import { processVersion } from './versionProcessor'
import { processHierarchy } from './hierarchyProcessor'
import { processMetrics, processActivityMetrics } from './metricsProcessor'

const prisma = new PrismaClient()

export async function processTitle(
  title: ECFRTitle,
  agencyId: string,
  content: ProcessedContent | null
): Promise<TitleProcessingResult> {
  try {
    // If no content provided (titles-only mode), just create/update title
    if (!content) {
      console.log('\nProcessing title without content (titles-only mode)...')
      
      // Check if title exists
      const existingTitle = await prisma.title.findUnique({
        where: { number: title.number }
      })

      // Create or update title
      let titleRecord: Title
      if (!existingTitle) {
        console.log('\nCreating new title record...')
        titleRecord = await prisma.title.create({
          data: {
            number: title.number,
            name: title.name,
            type: title.type || 'CFR',
            agencies: {
              connect: { id: agencyId }
            }
          }
        })
        console.log('Created title record:', {
          id: titleRecord.id,
          number: titleRecord.number,
          name: titleRecord.name
        })
      } else {
        console.log('\nUpdating existing title record...')
        titleRecord = await prisma.title.update({
          where: { id: existingTitle.id },
          data: {
            name: title.name,
            type: title.type || 'CFR',
            agencies: {
              connect: { id: agencyId }
            }
          }
        })
        console.log('Updated title record:', {
          id: titleRecord.id,
          number: titleRecord.number,
          name: titleRecord.name
        })
      }

      return {
        success: true,
        data: {
          id: titleRecord.id,
          number: titleRecord.number,
          name: titleRecord.name
        }
      }
    }

    // Full content processing mode
    console.log('\nProcessing title content...')
    console.log('Content structure:', {
      chapters: content.structure.chapters.length,
      wordCount: content.wordCount,
      textMetrics: {
        uniqueWords: content.textMetrics.uniqueWords,
        avgWordLength: content.textMetrics.avgWordLength.toFixed(2),
        avgSentenceLen: content.textMetrics.avgSentenceLen.toFixed(2)
      },
      references: content.references.length
    })

    // Check if title exists and get its latest version
    console.log('\nChecking for existing title...')
    const existingTitle = await prisma.title.findUnique({
      where: { number: title.number },
      include: {
        versions: {
          orderBy: {
            amendment_date: 'desc'
          },
          take: 1
        }
      }
    })

    const oldWordCount = existingTitle?.versions[0]?.wordCount ?? 0
    console.log('Previous version word count:', oldWordCount)

    // Create or update title
    let titleRecord: Title
    if (!existingTitle) {
      console.log('\nCreating new title record...')
      titleRecord = await prisma.title.create({
        data: {
          number: title.number,
          name: title.name,
          type: title.type || 'CFR',
          agencies: {
            connect: { id: agencyId }
          }
        }
      })
      console.log('Created title record:', {
        id: titleRecord.id,
        number: titleRecord.number,
        name: titleRecord.name
      })
    } else {
      console.log('\nUpdating existing title record...')
      titleRecord = await prisma.title.update({
        where: { id: existingTitle.id },
        data: {
          name: title.name,
          type: title.type || 'CFR',
          agencies: {
            connect: { id: agencyId }
          }
        }
      })
      console.log('Updated title record:', {
        id: titleRecord.id,
        number: titleRecord.number,
        name: titleRecord.name
      })
    }

    // Process hierarchy (chapters/parts/subparts/sections)
    console.log('\nProcessing title hierarchy...')
    await processHierarchy(titleRecord.id, content.structure)

    // Create version with content
    console.log('\nCreating version record...')
    const versionResult = await processVersion(titleRecord.id, {
      amendment_date: new Date().toISOString(),
      effective_date: new Date().toISOString(),
      published_date: new Date().toISOString(),
      authority: 'Initial version',
      source: 'eCFR API',
      fr_citations: [],
      changes: [{
        type: oldWordCount ? 'MODIFY' : 'ADD',
        section: 'full',
        description: oldWordCount ? 'Content updated' : 'Initial version'
      }]
    })

    if (!versionResult.success) {
      throw new Error(versionResult.error)
    }
    console.log('Created version record:', versionResult.data!.id)

    // Update version with content
    console.log('\nUpdating version with content...')
    await prisma.version.update({
      where: { id: versionResult.data!.id },
      data: {
        content: content.content,
        wordCount: content.wordCount
      }
    })
    console.log('Updated version content')

    // Process metrics
    console.log('\nProcessing metrics...')
    await processMetrics(versionResult.data!.id, content)
    console.log('Metrics processed')

    // Create word count
    console.log('\nCreating word count record...')
    const wordCount = await prisma.wordCount.create({
      data: {
        agencyId,
        count: content.wordCount,
        date: new Date()
      }
    })
    console.log('Created word count record:', wordCount.id)

    // Process activity metrics if this is an update
    if (oldWordCount > 0) {
      console.log('\nProcessing activity metrics...')
      await processActivityMetrics(agencyId, oldWordCount, content.wordCount)
      console.log('Activity metrics processed')
    }

    return {
      success: true,
      data: {
        id: titleRecord.id,
        number: titleRecord.number,
        name: titleRecord.name
      }
    }
  } catch (error) {
    console.error('\nError processing title:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing title'
    }
  }
}

export async function getLatestTitle(number: number) {
  return prisma.title.findUnique({
    where: { number },
    include: {
      versions: {
        orderBy: {
          amendment_date: 'desc'
        },
        take: 1
      }
    }
  })
}

export async function deleteTitle(id: string): Promise<void> {
  await prisma.title.delete({
    where: { id }
  })
}

export async function getTitleHistory(id: string) {
  return prisma.title.findUnique({
    where: { id },
    include: {
      versions: {
        include: {
          changes: true,
          citations: true
        },
        orderBy: {
          amendment_date: 'desc'
        }
      }
    }
  })
}