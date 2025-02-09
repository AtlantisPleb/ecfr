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
    // Check if title exists
    let titleRecord = await prisma.title.findUnique({
      where: { number: title.number }
    })

    // Create or update title
    if (!titleRecord) {
      titleRecord = await prisma.title.create({
        data: {
          number: title.number,
          name: title.name,
          type: title.type,
          agencies: {
            connect: { id: agencyId }
          }
        }
      })
    } else {
      // Update existing title
      await prisma.title.update({
        where: { id: titleRecord.id },
        data: {
          name: title.name,
          type: title.type,
          agencies: {
            connect: { id: agencyId }
          }
        }
      })
    }

    // Process hierarchy (chapters/parts/subparts/sections)
    await processHierarchy(titleRecord.id, content.structure)

    // Process version
    const versionResult = await processVersion(titleRecord.id, {
      amendment_date: new Date().toISOString(),
      content: content.content,
      wordCount: content.wordCount,
      changes: []
    })

    if (!versionResult.success) {
      throw new Error(versionResult.error)
    }

    // Process metrics
    await processMetrics(versionResult.data!.id, content)

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