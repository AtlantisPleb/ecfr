import { Agency, Title, Version, Change, WordCount, TextMetrics, Reference, ActivityMetrics } from '@prisma/client'

export interface CheckpointData {
  lastAgencyId: string | null
  lastTitleNumber: number | null
  timestamp: Date
  progress: {
    agenciesProcessed: number
    titlesProcessed: number
  }
}

export interface ECFRAgencyReference {
  title: number
  chapter: string
  part?: string
}

export interface ECFRAgency {
  name: string
  short_name: string | null
  display_name: string
  sortable_name: string
  slug: string
  children: ECFRAgency[]
  cfr_references: ECFRAgencyReference[]
}

export interface ECFRTitle {
  number: number
  name: string
  type: string
  chapter_count: number
  last_updated: string
}

export interface ProcessedContent {
  content: string
  wordCount: number
  textMetrics: TextMetricsData
  references: ReferenceData[]
}

// New interfaces for analysis metrics

export interface TextMetricsData {
  wordCount: number
  uniqueWords: number
  avgWordLength: number
  avgSentenceLen: number
}

export interface ReferenceData {
  targetId: string
  context: string
  type: 'INTERNAL' | 'EXTERNAL'
}

export interface ActivityMetricsData {
  newContent: number
  modifiedContent: number
  deletedContent: number
  totalWords: number
}

// Helper types for content analysis

export interface WordStats {
  total: number
  unique: number
  avgLength: number
}

export interface SentenceStats {
  count: number
  avgLength: number
}

export interface ContentDiff {
  added: string[]
  modified: string[]
  deleted: string[]
  wordCounts: {
    added: number
    modified: number
    deleted: number
  }
}