import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  query: z.string().describe("The partial search query to get suggestions for"),
  date: z.string().optional().describe("Optional date for historical suggestions (YYYY-MM-DD)"),
  title: z.string().optional().describe("Optional title number to get suggestions from"),
  agency_slugs: z.array(z.string()).optional().describe("Optional array of agency slugs to filter by")
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

      console.log("Making suggestions request:", searchParams.toString());

      const response = await fetch(
        `https://www.ecfr.gov/api/search/v1/suggestions?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Search suggestions API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });

        if (response.status === 400) {
          return {
            success: false,
            error: "Invalid search query. Please check your search terms and try again.",
            summary: "Search query validation failed",
            details: `The search suggestions API rejected the query: ${errorText}`
          };
        }

        throw new Error(`Search suggestions API returned ${response.status}: ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();

      // Validate response format
      if (!data || !Array.isArray(data.suggestions)) {
        throw new Error('Search suggestions API returned invalid response format');
      }
      
      return {
        success: true,
        suggestions: data.suggestions,
        summary: `Found ${data.suggestions.length} search suggestions`,
        details: `Search suggestions for "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        }${agency_slugs?.length ? ` filtered by agencies: ${agency_slugs.join(", ")}` : ""}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Search suggestions error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to get search suggestions",
        details: `Error getting search suggestions: ${errorMessage}`
      };
    }
  }
});