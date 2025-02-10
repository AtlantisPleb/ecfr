import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  query: z.string().describe("The search query to find relevant regulations"),
  date: z.string().optional().describe("Optional date for historical search"),
  title: z.string().optional().describe("Optional title number to search within")
});

type Params = z.infer<typeof params>;

type SearchSummary = {
  totalResults: number;
  processingTimeMs: number;
  topTerms: Array<{
    term: string;
    count: number;
  }>;
  dateRange?: {
    start: string;
    end: string;
  };
};

type Result = {
  success: boolean;
  summary?: SearchSummary;
  error?: string;
  summary_text: string;
  details: string;
};

export const searchSummaryTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get summary details of search results including top terms and date ranges",
  parameters: params,
  execute: async ({ query, date, title }: Params): Promise<Result> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append("query", query);
      
      if (date) {
        searchParams.append("date", date);
      }
      
      if (title) {
        searchParams.append("title", title);
      }

      console.log("Making summary request:", searchParams.toString());

      const response = await fetch(
        `https://www.ecfr.gov/api/search/v1/summary?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Search summary API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });

        if (response.status === 400) {
          return {
            success: false,
            error: "Invalid search query. Please check your search terms and try again.",
            summary_text: "Search query validation failed",
            details: `The search summary API rejected the query: ${errorText}`
          };
        }

        throw new Error(`Search summary API returned ${response.status}: ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        summary: data,
        summary_text: `Found ${data.totalResults} results in ${data.processingTimeMs}ms`,
        details: `Search summary for "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        } with ${data.topTerms.length} top terms`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Search summary error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        summary_text: "Failed to get search summary",
        details: `Error getting search summary: ${errorMessage}`
      };
    }
  }
});