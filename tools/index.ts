import { ToolContext } from "@/types"
import { searchResultsTool } from "./search-results"
import { listAgenciesTool } from "./list-agencies"

export const allTools = {
  search_results: { 
    tool: searchResultsTool, 
    description: "Search eCFR content using the provided query" 
  },
  list_agencies: { 
    tool: listAgenciesTool, 
    description: "Get list of all federal agencies with hierarchy" 
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