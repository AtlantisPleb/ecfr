import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  date: z.string().describe("The date to get structure for (YYYY-MM-DD)"),
  title: z.string().describe("The title number to get structure for"),
  identifier: z.string().optional().describe("Optional identifier within title (e.g., part-100 or chapter-I)")
});

type Params = z.infer<typeof params>;

type StructureNode = {
  identifier: string;
  type: string;
  label: string;
  children: StructureNode[];
  sourceUrl?: string;
};

type Result = {
  success: boolean;
  structure?: StructureNode;
  error?: string;
  summary: string;
  details: string;
};

export const getTitleStructureTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get complete structure of a title as JSON (without content)",
  parameters: params,
  execute: async ({ date, title, identifier }: Params): Promise<Result> => {
    try {
      const path = identifier 
        ? `title-${title}/${identifier}`
        : `title-${title}`;
        
      const response = await fetch(
        `https://www.ecfr.gov/api/versioner/v1/structure/${date}/${path}.json`
      );

      if (!response.ok) {
        throw new Error(`Structure API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        structure: data,
        summary: `Retrieved structure for Title ${title}${identifier ? ` ${identifier}` : ''} as of ${date}`,
        details: `Complete structure (without content) for Title ${title}${identifier ? ` ${identifier}` : ''} as of ${date}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to fetch title structure",
        details: `Error fetching eCFR title structure: ${errorMessage}`
      };
    }
  }
});