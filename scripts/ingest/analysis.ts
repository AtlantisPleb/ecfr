import { TextMetricsData, ReferenceData, WordStats, SentenceStats, ContentDiff } from './types'

/**
 * Calculates basic text metrics for a given content string
 */
export function calculateTextMetrics(content: string): TextMetricsData {
  const words = content.split(/\s+/).filter(w => w.length > 0)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  const wordLengths = words.map(w => w.length)
  const avgWordLength = wordLengths.reduce((a, b) => a + b, 0) / words.length

  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const sentenceLengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length)
  const avgSentenceLen = sentenceLengths.reduce((a, b) => a + b, 0) / sentences.length

  return {
    wordCount: words.length,
    uniqueWords: uniqueWords.size,
    avgWordLength,
    avgSentenceLen
  }
}

/**
 * Extracts references to other regulations from content
 */
export function extractReferences(content: string, sourceVersionId: string): ReferenceData[] {
  const references: ReferenceData[] = []
  
  // Match various reference patterns:
  const patterns = [
    // Standard CFR references
    /(\d+)\s*CFR\s*(?:part\s*)?(\d+(?:\.\d+)?)/gi,
    
    // Title and Part references
    /Title\s*(\d+),?\s*Part\s*(\d+)/gi,
    
    // Section references
    /§\s*(\d+\.\d+)/g,
    
    // Chapter references
    /Chapter\s*(\d+)/gi,
    
    // Subpart references
    /Subpart\s*([A-Z])/g
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const titleNum = match[1]
      const context = content.substring(
        Math.max(0, match.index - 100),
        Math.min(content.length, match.index + match[0].length + 100)
      ).trim()

      // For now, we'll use the source version as the target
      // This ensures the foreign key constraint is satisfied
      // TODO: Implement proper version lookup based on title/part
      const targetId = sourceVersionId
      
      references.push({
        targetId,
        context,
        type: 'INTERNAL' // This will be updated when we implement proper agency comparison
      })
    }
  }

  // Log what we found
  if (references.length > 0) {
    console.log(`Found ${references.length} references:`)
    references.forEach((ref, i) => {
      console.log(`${i + 1}. Context: "${ref.context.substring(0, 100)}..."`)
    })
  }

  return references
}

/**
 * Calculates word-level statistics for content
 */
export function getWordStats(content: string): WordStats {
  const words = content.split(/\s+/).filter(w => w.length > 0)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  const totalLength = words.reduce((sum, word) => sum + word.length, 0)

  return {
    total: words.length,
    unique: uniqueWords.size,
    avgLength: totalLength / words.length
  }
}

/**
 * Calculates sentence-level statistics
 */
export function getSentenceStats(content: string): SentenceStats {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const wordCounts = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length)
  const totalWords = wordCounts.reduce((a, b) => a + b, 0)

  return {
    count: sentences.length,
    avgLength: totalWords / sentences.length
  }
}

/**
 * Compares two versions of content and identifies changes
 */
export function compareVersions(oldContent: string, newContent: string): ContentDiff {
  const oldWords = oldContent.split(/\s+/).filter(w => w.length > 0)
  const newWords = newContent.split(/\s+/).filter(w => w.length > 0)

  const added: string[] = []
  const modified: string[] = []
  const deleted: string[] = []

  // Simple diff implementation - could be enhanced with actual diff algorithm
  const oldSet = new Set(oldWords)
  const newSet = new Set(newWords)

  for (const word of newWords) {
    if (!oldSet.has(word)) {
      added.push(word)
    }
  }

  for (const word of oldWords) {
    if (!newSet.has(word)) {
      deleted.push(word)
    }
  }

  // Consider words that changed position as modified
  const commonWords = oldWords.filter(w => newSet.has(w))
  const oldPositions = commonWords.map(w => oldWords.indexOf(w))
  const newPositions = commonWords.map(w => newWords.indexOf(w))
  
  for (let i = 0; i < commonWords.length; i++) {
    if (oldPositions[i] !== newPositions[i]) {
      modified.push(commonWords[i])
    }
  }

  return {
    added,
    modified,
    deleted,
    wordCounts: {
      added: added.length,
      modified: modified.length,
      deleted: deleted.length
    }
  }
}