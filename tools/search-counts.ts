import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  query: z.string().describe("The search query to find relevant regulations"),
  groupBy: z.enum(["daily", "titles", "hierarchy"]).describe("How to group the search results"),
  date: z.string().optional().describe("Optional date for historical search"),
  title: z.string().optional().describe("Optional title number to search within")
});

type Params = z.infer<typeof params>;

type CountResult = {
  key: string;
  count: number;
  label?: string;
};

type Result = {
  success: boolean;
  counts?: CountResult[];
  error?: string;
  summary: string;
  details: string;
};

export const searchCountsTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get search result counts grouped by date, title, or hierarchy path",
  parameters: params,
  execute: async ({ query, groupBy, date, title }: Params): Promise<Result> => {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        ...(date && { date }),
        ...(title && { title })
      });

      const response = await fetch(
        `https://www.ecfr.gov/api/search/v1/counts/${groupBy}?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Search counts API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        counts: data.counts,
        summary: `Retrieved ${data.counts.length} count groups`,
        details: `Search counts grouped by ${groupBy} for "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        }`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to get search counts",
        details: `Error getting search counts: ${errorMessage}`
      };
    }
  }
});