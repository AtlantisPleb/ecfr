import { ToolContext } from "@/types"
import { searchResultsTool } from "./search-results"
import { listAgenciesTool } from "./list-agencies"
import { listCorrectionsTool } from "./list-corrections"
import { getTitleAncestryTool } from "./get-title-ancestry"
import { getTitleStructureTool } from "./get-title-structure"
import { getTitleFullTool } from "./get-title-full"
import { listTitlesTool } from "./list-titles"
import { searchCountTool } from "./search-count"
import { searchSummaryTool } from "./search-summary"
import { searchCountsTool } from "./search-counts"
import { searchSuggestionsTool } from "./search-suggestions"

export const allTools = {
  search_results: { 
    tool: searchResultsTool, 
    description: "Search eCFR content using the provided query" 
  },
  list_agencies: { 
    tool: listAgenciesTool, 
    description: "Get list of all federal agencies with hierarchy" 
  },
  list_corrections: {
    tool: listCorrectionsTool,
    description: "Get all eCFR corrections with optional filtering by title, effective date, or correction date"
  },
  get_title_ancestry: {
    tool: getTitleAncestryTool,
    description: "Get complete ancestry from a given level through the top title node"
  },
  get_title_structure: {
    tool: getTitleStructureTool,
    description: "Get complete structure of a title as JSON (without content)"
  },
  get_title_full: {
    tool: getTitleFullTool,
    description: "Get source XML for a title or subset of a title"
  },
  list_titles: {
    tool: listTitlesTool,
    description: "Get summary information about each title's status and metadata"
  },
  search_count: {
    tool: searchCountTool,
    description: "Get total count of search results for a query"
  },
  search_summary: {
    tool: searchSummaryTool,
    description: "Get summary details of search results including top terms and date ranges"
  },
  search_counts: {
    tool: searchCountsTool,
    description: "Get search result counts grouped by date, title, or hierarchy path"
  },
  search_suggestions: {
    tool: searchSuggestionsTool,
    description: "Get search term suggestions based on partial query"
  }
} as const;

type ToolName = keyof typeof allTools;

export const getTools = (context: ToolContext, toolNames: ToolName[]) => {
  const tools: Partial<Record<ToolName, ReturnType<typeof allTools[ToolName]["tool"]>>> = {};
  toolNames.forEach(toolName => {
    if (allTools[toolName]) {
      tools[toolName] = allTools[toolName].tool(context);
    }
  });
  return tools;
};