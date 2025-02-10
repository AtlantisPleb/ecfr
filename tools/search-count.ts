import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  query: z.string().describe("The search query to find relevant regulations"),
  date: z.string().optional().describe("Optional date for historical search"),
  title: z.string().optional().describe("Optional title number to search within")
});

type Params = z.infer<typeof params>;

type Result = {
  success: boolean;
  count?: number;
  error?: string;
  summary: string;
  details: string;
};

export const searchCountTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get total count of search results for a query",
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

      console.log("Making count request:", searchParams.toString());

      const response = await fetch(
        `https://www.ecfr.gov/api/search/v1/count?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Search count API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });

        if (response.status === 400) {
          return {
            success: false,
            error: "Invalid search query. Please check your search terms and try again.",
            summary: "Search query validation failed",
            details: `The search count API rejected the query: ${errorText}`
          };
        }

        throw new Error(`Search count API returned ${response.status}: ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        count: data.count,
        summary: `Found ${data.count} matching regulations`,
        details: `Total count for query "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        }`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Search count error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to get search count",
        details: `Error getting search count: ${errorMessage}`
      };
    }
  }
});