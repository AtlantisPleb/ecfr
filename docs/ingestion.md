# eCFR Data Ingestion System

## Overview
The ingestion system downloads and processes data from the eCFR API, storing it in a structured database. It handles agencies, titles, and their hierarchical content (chapters, parts, subparts, sections), along with versioning and analytics data.

## File Structure

### Core Files
- `scripts/ingest/api.ts` - Core API interface with rate limiting and error handling
- `scripts/ingest/analysis.ts` - Text analysis utilities for metrics and references
- `scripts/ingest/checkpoint.ts` - Progress tracking functionality
- `scripts/ingest/index.ts` - Main entry point
- `scripts/ingest/rateLimiter.ts` - API rate limiting implementation
- `scripts/ingest/run.ts` - Ingestion process runner
- `scripts/ingest/types.ts` - TypeScript type definitions

### Processors
- `scripts/ingest/processors/agencyProcessor.ts` - Handles agency data processing and relationships
- `scripts/ingest/processors/hierarchyProcessor.ts` - Manages content hierarchy (chapters/parts/subparts/sections)
- `scripts/ingest/processors/metricsProcessor.ts` - Processes text metrics and activity tracking
- `scripts/ingest/processors/titleProcessor.ts` - Handles title processing and version management
- `scripts/ingest/processors/versionProcessor.ts` - Manages content versions and change tracking

## Architecture

### Core Components

#### 1. API Interface (`api.ts`)
- Handles all eCFR API communication
- Implements rate limiting and retry logic
- Endpoints used:
  - `/api/admin/v1/agencies.json` - Agency list
  - `/api/versioner/v1/titles.json` - Title list
  - `/api/versioner/v1/versions/title-{number}.json` - Title versions
  - `/api/versioner/v1/structure/{date}/title-{number}.json` - Title content

#### 2. Analysis (`analysis.ts`)
- Text metrics calculation
  - Word count
  - Unique words
  - Average word length
  - Average sentence length
- Reference extraction
  - CFR references
  - Title/Part references
  - Section references
  - Chapter references
  - Subpart references

#### 3. Processors
- **agencyProcessor.ts**:
  - Agency creation/updates
  - Slug generation
  - Sortable name generation
  - Agency relationships
  
- **hierarchyProcessor.ts**:
  - Hierarchical content management
  - Chapter/Part/Subpart/Section creation
  - Content cleanup and validation
  - Structure maintenance
  
- **metricsProcessor.ts**:
  - Text metrics processing
  - Reference tracking
  - Activity metrics
  - Word count tracking
  
- **titleProcessor.ts**:
  - Title creation/updates
  - Version management
  - Agency associations
  - Content processing
  
- **versionProcessor.ts**:
  - Version creation
  - Change tracking
  - Citation management
  - Content updates

### Data Flow

1. Initial Data Fetch
```
fetchAgencies() → Agency list
fetchTitles() → Title list
```

2. Title Processing
```
For each title:
  ensureTitleExists()
  processTitleContent()
    ├→ fetchTitleContent()
    ├→ processHierarchy()
    ├→ createVersion()
    └→ processMetrics()
```

3. Analytics Generation
```
For each version:
  calculateTextMetrics()
  extractReferences()
  trackWordCounts()
  generateActivityMetrics()
```

## Database Schema

### Core Tables
- `Agency`: `id, name, short_name, display_name, sortable_name, slug, parent_id`
- `Title`: `id, number, name, type, chapter, part, subpart, section, url`
- `Version`: `id, titleId, content, wordCount, date`
- `Change`: `id, versionId, type, section, description`

### Hierarchical Tables
- `Chapter`: `id, number, name, titleId`
- `Part`: `id, number, name, chapterId`
- `Subpart`: `id, name, partId`
- `Section`: `id, number, name, content, subpartId`

### Analytics Tables
- `TextMetrics`: `id, versionId, wordCount, uniqueWords, avgWordLength, avgSentenceLen`
- `Reference`: `id, sourceId, targetId, context, type`
- `ActivityMetrics`: `id, agencyId, date, newContent, modifiedContent, deletedContent, totalWords`
- `WordCount`: `id, agencyId, count, date`

## Progress Tracking

The system maintains progress using checkpoints:
- Tracks processed agencies and titles
- Allows resuming interrupted ingestion
- Prevents duplicate processing

Progress indicators show:
- Overall agency progress
- Per-agency title progress
- Overall title progress
- Individual operation status

## Error Handling

1. API Errors
   - Rate limiting with exponential backoff
   - Automatic retries for transient failures
   - Skip missing/invalid content

2. Database Errors
   - Transaction rollback on failure
   - Foreign key constraint protection
   - Duplicate prevention

3. Content Errors
   - Invalid JSON handling
   - Missing field detection
   - Structure validation

## Usage

### Basic Run
```bash
pnpm run ingest
```

### Clean Start
```bash
pnpm run ingest:clean  # Cleans DB first
```

### Database Management
```bash
pnpm run db:clean     # Clear all data
pnpm run db:migrate   # Run migrations
pnpm run studio      # Open Prisma Studio
```

## Monitoring

The ingestion process provides real-time feedback:
```
Starting eCFR ingestion...
Fetching agencies list...
Fetching titles list...
Found 153 agencies and 50 titles
Creating/updating titles...

Processing title 1: General Provisions
Progress: ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2% (1/50)
Status: Created
```