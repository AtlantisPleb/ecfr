import { Agency, Title, Version, Change, WordCount } from '@prisma/client'

export interface CheckpointData {
  lastAgencyId: string | null
  lastTitleNumber: number | null
  timestamp: Date
  progress: {
    agenciesProcessed: number
    titlesProcessed: number
  }
}

export interface ECFRAgency {
  id: string
  name: string
  url: string
  chapters: Array<{
    title: number
    chapter: number
    name: string
  }>
}

export interface ECFRTitle {
  number: number
  name: string
  agencies: string[]
  xml_url: string
}

export interface ProcessedContent {
  content: string
  wordCount: number
}