import { PrismaClient } from '@prisma/client'
import { TextMetricsData, ReferenceData } from '../types'
import { calculateTextMetrics, extractReferences } from '../analysis'

export async function processMetrics(
  prisma: PrismaClient,
  versionId: string,
  content: string,
  agencyId: string
): Promise<void> {
  // Calculate text metrics
  const textMetrics = calculateTextMetrics(content)

  // Create text metrics record
  await prisma.textMetrics.create({
    data: {
      versionId,
      ...textMetrics
    }
  }).catch(error => {
    console.error('Database error creating text metrics:', error)
    throw error
  })

  // Extract and create references
  const references = extractReferences(content, versionId)
  for (const ref of references) {
    await prisma.reference.create({
      data: {
        sourceId: versionId,
        targetId: versionId, // For now, reference itself
        context: ref.context,
        type: ref.type
      }
    }).catch(error => {
      console.error('Database error creating reference:', error)
    })
  }

  // Create word count
  await prisma.wordCount.create({
    data: {
      agencyId,
      count: textMetrics.wordCount,
      date: new Date()
    }
  }).catch(error => {
    console.error('Database error creating word count:', error)
    throw error
  })
}

export async function processActivityMetrics(
  prisma: PrismaClient,
  agencyId: string,
  oldWordCount: number,
  newWordCount: number
): Promise<void> {
  await prisma.activityMetrics.create({
    data: {
      agencyId,
      date: new Date(),
      newContent: Math.max(0, newWordCount - oldWordCount),
      modifiedContent: Math.abs(newWordCount - oldWordCount),
      deletedContent: Math.max(0, oldWordCount - newWordCount),
      totalWords: newWordCount
    }
  }).catch(error => {
    console.error('Database error creating activity metrics:', error)
  })
}