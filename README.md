# ChatCFR

An AI-powered chat interface for the Electronic Code of Federal Regulations (eCFR). Ask questions about federal regulations and get accurate answers backed by the official eCFR API, with direct references to relevant sections and intelligent analysis of regulatory content.

## Features

### AI Chat Interface
- Natural language interaction with federal regulations
- Direct access to all eCFR API endpoints through specialized tools:
  - Search across all regulations with intelligent summarization
  - Get complete title ancestry and structure
  - Access full regulatory content and XML sources
  - Track corrections and changes over time
- Smart suggestions and context-aware responses
- Citations and direct references to source material

### Regulatory Data Analysis
- Complete coverage of eCFR API services:
  - Admin Service for corrections and changes
  - Versioner Service for structure and content
  - Search Service with advanced filtering
- Metrics and insights:
  - Word count per agency
  - Historical changes
  - Cross-references
  - Agency relationships
- Interactive agency browser
- Hierarchical content navigation

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AtlantisPleb/ecfr.git
cd ecfr
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment file and configure:
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

4. Run database migrations:
```bash
pnpm prisma migrate dev
```

### Running the Application

Start the development server:
```bash
pnpm dev
```

The application will be available at http://localhost:3000

## Data Ingestion

The application includes a system for downloading and processing eCFR data to power the chat interface. The ingestion script supports various flags to control the process:

### Basic Usage

```bash
# Full ingestion of all agencies and content
pnpm run ingest

# Quick ingestion of just agencies and titles
pnpm run ingest --depth=titles

# Process specific agency
pnpm run ingest --agency=department-of-agriculture

# Skip deep hierarchy processing
pnpm run ingest --skip-hierarchy
```

### Available Flags

- `--depth, -d`: Control processing depth
  - `titles`: Only process agency-title relationships
  - `chapters`: Process up to chapter level
  - `parts`: Process up to parts level
  - `full`: Process everything (default)

- `--skip-hierarchy, -s`: Skip processing of parts/sections/subparts
  - Useful for quick initial data population

- `--agency, -a`: Process specific agency by slug
  - Example: `--agency=department-of-agriculture`

- `--batch-size, -b`: Control how many items to process at once
  - Example: `--batch-size=10`

### Examples

```bash
# Process Department of Agriculture up to chapters only
pnpm run ingest --agency=department-of-agriculture --depth=chapters

# Quick scan of all agencies with batch processing
pnpm run ingest --depth=titles --batch-size=20

# Full processing of specific agency
pnpm run ingest --agency=environmental-protection-agency --depth=full

# Skip hierarchy for faster processing
pnpm run ingest --skip-hierarchy --batch-size=50
```

## License

MIT