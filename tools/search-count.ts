import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  query: z.string().describe("The search query to find relevant regulations"),
  date: z.string().optional().describe("Optional date for historical search (YYYY-MM-DD)"),
  title: z.string().optional().describe("Optional title number to search within"),
  agency_slugs: z.array(z.string()).optional().describe("Optional array of agency slugs to filter by")
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
  execute: async ({ query, date, title, agency_slugs }: Params): Promise<Result> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append("query", query);
      
      if (date) {
        searchParams.append("date", date);
      }
      
      if (title) {
        searchParams.append("title", title);
      }

      if (agency_slugs && agency_slugs.length > 0) {
        agency_slugs.forEach(slug => {
          searchParams.append("agency_slugs[]", slug);
        });
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
      
      if (typeof data.count !== 'number') {
        throw new Error('Search count API returned invalid response format');
      }

      return {
        success: true,
        count: data.count,
        summary: `Found ${data.count} matching regulations`,
        details: `Total count for query "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        }${agency_slugs?.length ? ` filtered by agencies: ${agency_slugs.join(", ")}` : ""}`
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