import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  date: z.string().describe("The date to get ancestry for (YYYY-MM-DD)"),
  title: z.string().describe("The title number to get ancestry for"),
  identifier: z.string().optional().describe("Optional identifier within title (e.g., part-100 or chapter-I)")
});

type Params = z.infer<typeof params>;

type AncestryNode = {
  identifier: string;
  type: string;
  label: string;
  children?: AncestryNode[];
};

type Result = {
  success: boolean;
  ancestry?: AncestryNode;
  error?: string;
  summary: string;
  details: string;
};

export const getTitleAncestryTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get complete ancestry from a given level through the top title node",
  parameters: params,
  execute: async ({ date, title, identifier }: Params): Promise<Result> => {
    try {
      const path = identifier 
        ? `title-${title}/${identifier}`
        : `title-${title}`;
        
      const response = await fetch(
        `https://www.ecfr.gov/api/versioner/v1/ancestry/${date}/${path}.json`
      );

      if (!response.ok) {
        throw new Error(`Ancestry API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        ancestry: data,
        summary: `Retrieved ancestry for Title ${title}${identifier ? ` ${identifier}` : ''} as of ${date}`,
        details: `Complete hierarchy structure for Title ${title}${identifier ? ` ${identifier}` : ''} as of ${date}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to fetch title ancestry",
        details: `Error fetching eCFR title ancestry: ${errorMessage}`
      };
    }
  }
});