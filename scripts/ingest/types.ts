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
  agencies: string[]
  xml_url: string
}

export interface ProcessedContent {
  content: string
  wordCount: number
}