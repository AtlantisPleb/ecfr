import { PrismaClient } from '@prisma/client'
import { TextMetricsData, ReferenceData, ProcessedContent } from '../types'
import { calculateTextMetrics, extractReferences } from '../analysis'

const prisma = new PrismaClient()

export async function processMetrics(
  versionId: string,
  content: ProcessedContent
): Promise<void> {
  // Create text metrics
  await prisma.textMetrics.create({
    data: {
      versionId,
      ...content.textMetrics
    }
  })

  // Create references
  for (const ref of content.references) {
    await prisma.reference.create({
      data: {
        sourceId: versionId,
        targetId: versionId, // For now, reference itself
        context: ref.context,
        type: ref.type
      }
    })
  }
}

export async function processActivityMetrics(
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
  })
}