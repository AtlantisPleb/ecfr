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
  content: string;
  summary: string;
  details: string;
};

export const searchResultsTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Search eCFR content using the provided query",
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

      const response = await fetch(
        `https://www.ecfr.gov/api/search/v1/results?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          content: errorText,
          summary: "Search request failed",
          details: `API returned ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        content: JSON.stringify(data, null, 2),
        summary: "Retrieved search results",
        details: `Search results for "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        }${agency_slugs?.length ? ` filtered by agencies: ${agency_slugs.join(", ")}` : ""}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        content: errorMessage,
        summary: "Failed to search regulations",
        details: `Error searching eCFR content: ${errorMessage}`
      };
    }
  }
});