import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  query: z.string().describe("The search query to find relevant regulations"),
  date: z.string().optional().describe("Optional date for historical search"),
  title: z.string().optional().describe("Optional title number to search within")
});

type Params = z.infer<typeof params>;

type SearchResult = {
  title: string;
  section: string;
  content: string;
  hierarchy: {
    title: string;
    chapter: string;
    part: string;
    subpart?: string;
    section: string;
  };
  url: string;
  score: number;
};

type Result = {
  success: boolean;
  results?: SearchResult[];
  error?: string;
  summary: string;
  details: string;
};

export const searchResultsTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Search eCFR content using the provided query",
  parameters: params,
  execute: async ({ query, date, title }: Params): Promise<Result> => {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        ...(date && { date }),
        ...(title && { title })
      });

      const response = await fetch(
        `https://www.ecfr.gov/api/search/v1/results?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        results: data.results,
        summary: `Found ${data.results.length} matching regulations`,
        details: `Search results for query "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        }`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to search regulations",
        details: `Error searching eCFR content: ${errorMessage}`
      };
    }
  }
});