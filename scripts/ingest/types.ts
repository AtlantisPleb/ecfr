// API Response Types

export interface ECFRAgency {
  name: string;
  short_name: string | null;
  display_name: string;
  sortable_name: string;
  slug: string;
  children: ECFRAgency[];
  cfr_references: ECFRAgencyReference[];
  parent_id?: string;
}

export interface ECFRAgencyReference {
  title: number;
  chapter: number;
  part: number;
  subpart?: string;
  section?: string;
}

export interface ECFRTitle {
  number: number;
  name: string;
  type: string;
  chapter_count: number;
  last_updated: string;
  chapters: ECFRChapter[];
}

export interface ECFRChapter {
  number: number;
  name: string;
  parts: ECFRPart[];
}

export interface ECFRPart {
  number: number;
  name: string;
  subparts: ECFRSubpart[];
}

export interface ECFRSubpart {
  name: string;
  sections: ECFRSection[];
}

export interface ECFRSection {
  number: string;
  name: string;
  content: string;
}

export interface ECFRVersionsResponse {
  meta: {
    latest_amendment_date: string;
  };
  content_versions: ECFRVersion[];
}

export interface ECFRVersion {
  amendment_date: string;
  effective_date?: string;
  published_date?: string;
  authority?: string;
  source?: string;
  fr_citations: ECFRCitation[];
  changes: ECFRChange[];
}

export interface ECFRCitation {
  volume: number;
  page: number;
  date: string;
  type: string;
  url?: string;
}

export interface ECFRChange {
  type: 'ADD' | 'MODIFY' | 'DELETE';
  section: string;
  description: string;
  fr_citation?: ECFRCitation;
  amendment_part?: string;
  effective_date?: string;
  url?: string;
}

// Processing Result Types

export interface ProcessingResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface TitleProcessingResult extends ProcessingResult {
  data?: {
    id: string;
    number: number;
    name: string;
  };
}

export interface VersionProcessingResult extends ProcessingResult {
  data?: {
    id: string;
    amendment_date: Date;
    changes: ChangeProcessingResult[];
  };
}

export interface ChangeProcessingResult extends ProcessingResult {
  data?: {
    id: string;
    type: string;
    section: string;
  };
}

// Progress Tracking Types

export interface ProcessingProgress {
  total: number;
  current: number;
  completed: string[];
  failed: string[];
}

export interface TitleProgress extends ProcessingProgress {
  currentTitle?: number;
}

export interface VersionProgress extends ProcessingProgress {
  currentVersion?: string;
}

// Analysis Types

export interface TextMetricsData {
  wordCount: number;
  uniqueWords: number;
  avgWordLength: number;
  avgSentenceLen: number;
}

export interface ReferenceData {
  targetId: string;
  context: string;
  type: 'INTERNAL' | 'EXTERNAL';
}

export interface WordStats {
  total: number;
  unique: number;
  avgLength: number;
}

export interface SentenceStats {
  count: number;
  avgLength: number;
}

export interface ContentDiff {
  added: string[];
  modified: string[];
  deleted: string[];
  wordCounts: {
    added: number;
    modified: number;
    deleted: number;
  };
}

export interface ProcessedContent {
  content: string;
  wordCount: number;
  textMetrics: TextMetricsData;
  references: ReferenceData[];
  structure: {
    chapters: ProcessedChapter[];
  };
}

export interface ProcessedChapter {
  number: number;
  name: string;
  parts: ProcessedPart[];
}

export interface ProcessedPart {
  number: number;
  name: string;
  subparts: ProcessedSubpart[];
}

export interface ProcessedSubpart {
  name: string;
  sections: ProcessedSection[];
}

export interface ProcessedSection {
  number: string;
  name: string;
  content: string;
}

export interface CheckpointData {
  lastAgencyId: string | null;
  lastTitleNumber: number | null;
  timestamp: Date;
  progress: {
    agenciesProcessed: number;
    titlesProcessed: number;
  };
}