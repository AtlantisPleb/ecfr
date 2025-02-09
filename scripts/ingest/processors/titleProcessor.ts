import { PrismaClient } from '@prisma/client'
import { ECFRTitle, ProcessedContent, TitleProcessingResult } from '../types'
import { processVersion } from './versionProcessor'
import { processHierarchy } from './hierarchyProcessor'
import { processMetrics } from './metricsProcessor'

const prisma = new PrismaClient()

export async function processTitle(
  title: ECFRTitle,
  agencyId: string,
  content: ProcessedContent
): Promise<TitleProcessingResult> {
  try {
    console.log('\nProcessing title content...')
    console.log('Content structure:', {
      chapters: content.structure.chapters.length,
      wordCount: content.wordCount,
      textMetrics: content.textMetrics,
      references: content.references.length
    })

    // Check if title exists
    let titleRecord = await prisma.title.findUnique({
      where: { number: title.number }
    })

    // Create or update title
    if (!titleRecord) {
      console.log('Creating new title record...')
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
      console.log('Created title record:', titleRecord.id)
    } else {
      console.log('Updating existing title record...')
      await prisma.title.update({
        where: { id: titleRecord.id },
        data: {
          name: title.name,
          type: title.type || 'CFR',
          agencies: {
            connect: { id: agencyId }
          }
        }
      })
      console.log('Updated title record:', titleRecord.id)
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
        type: 'ADD',
        section: 'full',
        description: 'Initial version'
      }]
    })

    if (!versionResult.success) {
      throw new Error(versionResult.error)
    }
    console.log('Created version record:', versionResult.data!.id)

    // Update version with content
    console.log('Updating version with content...')
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
    await prisma.wordCount.create({
      data: {
        agencyId,
        count: content.wordCount,
        date: new Date()
      }
    })
    console.log('Created word count record')

    return {
      success: true,
      data: {
        id: titleRecord.id,
        number: titleRecord.number,
        name: titleRecord.name
      }
    }
  } catch (error) {
    console.error('Error processing title:', error)
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