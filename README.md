# eCFR Analyzer

A web application for analyzing the Electronic Code of Federal Regulations (eCFR). This tool downloads and processes federal regulations from the eCFR API, providing insights into regulatory content, changes over time, and relationships between agencies and their regulations.

## Features

- Downloads and processes current eCFR content
- Analyzes regulations for metrics like:
  - Word count per agency
  - Historical changes over time
  - Cross-references between regulations
  - Agency relationships
- Interactive web interface for exploring regulations
- Hierarchical content navigation (titles/chapters/parts/sections)
- Version history tracking
- Activity metrics and change analysis

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

The application includes a powerful ingestion system for downloading and processing eCFR data. The ingestion script supports various flags to control the process:

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