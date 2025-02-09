import { PrismaClient } from '@prisma/client'
import { TextMetricsData, ReferenceData, ProcessedContent } from '../types'
import { calculateTextMetrics, extractReferences } from '../analysis'

const prisma = new PrismaClient()

export async function processMetrics(
  versionId: string,
  content: ProcessedContent
): Promise<void> {
  console.log('\nProcessing metrics for version:', versionId)
  
  try {
    // Create text metrics
    console.log('Creating text metrics record...')
    console.log('Metrics data:', {
      wordCount: content.textMetrics.wordCount,
      uniqueWords: content.textMetrics.uniqueWords,
      avgWordLength: content.textMetrics.avgWordLength.toFixed(2),
      avgSentenceLen: content.textMetrics.avgSentenceLen.toFixed(2)
    })
    
    const textMetrics = await prisma.textMetrics.create({
      data: {
        versionId,
        ...content.textMetrics
      }
    })
    console.log('Created text metrics record:', textMetrics.id)

    // Create references
    console.log(`\nProcessing ${content.references.length} references...`)
    let processedRefs = 0
    
    for (const ref of content.references) {
      try {
        const reference = await prisma.reference.create({
          data: {
            sourceId: versionId,
            targetId: versionId, // For now, reference itself
            context: ref.context,
            type: ref.type
          }
        })
        processedRefs++
        
        if (processedRefs % 10 === 0) {
          console.log(`Processed ${processedRefs}/${content.references.length} references`)
        }
      } catch (error) {
        console.error('Error processing reference:', error)
        console.error('Reference data:', {
          context: ref.context.substring(0, 100) + '...',
          type: ref.type
        })
      }
    }
    
    console.log(`\nMetrics processing complete:`)
    console.log(`- Text metrics created`)
    console.log(`- ${processedRefs}/${content.references.length} references processed`)
  } catch (error) {
    console.error('\nError in processMetrics:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    throw error
  }
}

export async function processActivityMetrics(
  agencyId: string,
  oldWordCount: number,
  newWordCount: number
): Promise<void> {
  console.log('\nProcessing activity metrics...')
  console.log('Input:', {
    agencyId,
    oldWordCount,
    newWordCount,
    difference: newWordCount - oldWordCount
  })
  
  try {
    const metrics = await prisma.activityMetrics.create({
      data: {
        agencyId,
        date: new Date(),
        newContent: Math.max(0, newWordCount - oldWordCount),
        modifiedContent: Math.abs(newWordCount - oldWordCount),
        deletedContent: Math.max(0, oldWordCount - newWordCount),
        totalWords: newWordCount
      }
    })
    
    console.log('Created activity metrics:', {
      id: metrics.id,
      newContent: metrics.newContent,
      modifiedContent: metrics.modifiedContent,
      deletedContent: metrics.deletedContent,
      totalWords: metrics.totalWords
    })
  } catch (error) {
    console.error('\nError in processActivityMetrics:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    throw error
  }
}