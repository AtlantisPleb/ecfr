import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  date: z.string().describe("The date to get content for (YYYY-MM-DD)"),
  title: z.string().describe("The title number to get content for"),
  identifier: z.string().optional().describe("Optional identifier within title (e.g., part-100 or chapter-I)")
});

type Params = z.infer<typeof params>;

type Result = {
  success: boolean;
  content?: string;
  error?: string;
  summary: string;
  details: string;
};

export const getTitleFullTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get source XML for a title or subset of a title",
  parameters: params,
  execute: async ({ date, title, identifier }: Params): Promise<Result> => {
    try {
      const path = identifier 
        ? `title-${title}/${identifier}`
        : `title-${title}`;
        
      const response = await fetch(
        `https://www.ecfr.gov/api/versioner/v1/full/${date}/${path}.xml`
      );

      if (!response.ok) {
        throw new Error(`Full content API returned ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      
      return {
        success: true,
        content,
        summary: `Retrieved full XML content for Title ${title}${identifier ? ` ${identifier}` : ''} as of ${date}`,
        details: `Complete XML source for Title ${title}${identifier ? ` ${identifier}` : ''} as of ${date}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to fetch title content",
        details: `Error fetching eCFR title content: ${errorMessage}`
      };
    }
  }
});