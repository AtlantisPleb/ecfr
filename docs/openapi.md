# eCFR API Documentation

## Admin Service (docs/openapi-admin.json)

- `/api/admin/v1/agencies.json` - Get all top-level agencies in name order with children also in name order
- `/api/admin/v1/corrections.json` - Get all eCFR corrections with optional filtering by title, effective date, or correction date
- `/api/admin/v1/corrections/title/{title}.json` - Get all corrections for a specific title

## Versioner Service (docs/openapi-versioner.json)

- `/api/versioner/v1/ancestry/{date}/title-{title}.json` - Get complete ancestry from a given level through the top title node
- `/api/versioner/v1/full/{date}/title-{title}.xml` - Get source XML for a title or subset of a title
- `/api/versioner/v1/structure/{date}/title-{title}.json` - Get complete structure of a title as JSON (without content)
- `/api/versioner/v1/titles.json` - Get summary information about each title's status and metadata

## Search Service (docs/openapi-search.json)

- `/api/search/v1/count` - Get total count of search results
- `/api/search/v1/summary` - Get summary details of search results
- `/api/search/v1/counts/daily` - Get search result counts grouped by date
- `/api/search/v1/counts/titles` - Get search result counts grouped by title
- `/api/search/v1/counts/hierarchy` - Get search result counts grouped by hierarchy path
- `/api/search/v1/suggestions` - Get search term suggestions based on query

Each service's specification includes detailed parameter information, response schemas, and examples in their respective OpenAPI files.
