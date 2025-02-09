import { Agency, Title, Version, Change, WordCount, TextMetrics, Reference, ActivityMetrics, Chapter, Part, Subpart, Section } from '@prisma/client'

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
  parent_id?: string
}

export interface ECFRTitle {
  number: number
  name: string
  type: string
  chapter_count: number
  last_updated: string
  chapters: ECFRChapter[]
}

export interface ECFRChapter {
  number: number
  name: string
  parts: ECFRPart[]
}

export interface ECFRPart {
  number: number
  name: string
  subparts: ECFRSubpart[]
}

export interface ECFRSubpart {
  name: string
  sections: ECFRSection[]
}

export interface ECFRSection {
  number: string
  name: string
  content: string
}

export interface ProcessedContent {
  content: string
  wordCount: number
  textMetrics: TextMetricsData
  references: ReferenceData[]
  structure: {
    chapters: ProcessedChapter[]
  }
}

export interface ProcessedChapter {
  number: number
  name: string
  parts: ProcessedPart[]
}

export interface ProcessedPart {
  number: number
  name: string
  subparts: ProcessedSubpart[]
}

export interface ProcessedSubpart {
  name: string
  sections: ProcessedSection[]
}

export interface ProcessedSection {
  number: string
  name: string
  content: string
}

// Analysis metrics interfaces

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