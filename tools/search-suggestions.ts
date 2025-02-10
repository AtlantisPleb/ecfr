import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  query: z.string().describe("The partial search query to get suggestions for"),
  date: z.string().optional().describe("Optional date for historical suggestions"),
  title: z.string().optional().describe("Optional title number to get suggestions from")
});

type Params = z.infer<typeof params>;

type Suggestion = {
  text: string;
  score: number;
  frequency: number;
};

type Result = {
  success: boolean;
  suggestions?: Suggestion[];
  error?: string;
  summary: string;
  details: string;
};

export const searchSuggestionsTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get search term suggestions based on partial query",
  parameters: params,
  execute: async ({ query, date, title }: Params): Promise<Result> => {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        ...(date && { date }),
        ...(title && { title })
      });

      const response = await fetch(
        `https://www.ecfr.gov/api/search/v1/suggestions?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Search suggestions API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        suggestions: data.suggestions,
        summary: `Found ${data.suggestions.length} search suggestions`,
        details: `Search suggestions for "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        }`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to get search suggestions",
        details: `Error getting search suggestions: ${errorMessage}`
      };
    }
  }
});