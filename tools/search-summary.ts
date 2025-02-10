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
  content: string;
  summary: string;
  details: string;
};

export const searchSummaryTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get summary details of search results including top terms and date ranges",
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
            content: "Invalid search query. Please check your search terms and try again.",
            summary: "Search query validation failed",
            details: `The search summary API rejected the query: ${errorText}`
          };
        }

        throw new Error(`Search summary API returned ${response.status}: ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      console.log("API Response:", JSON.stringify(data, null, 2));

      // More flexible validation
      const summaryData: Partial<SearchSummary> = {
        totalResults: typeof data.totalResults === 'number' ? data.totalResults : 0,
        processingTimeMs: typeof data.processingTimeMs === 'number' ? data.processingTimeMs : 0,
        topTerms: Array.isArray(data.topTerms) ? data.topTerms : [],
        dateRange: data.dateRange || undefined
      };
      
      // Format the content as a readable string
      const contentParts = [];

      if (typeof summaryData.totalResults === 'number') {
        contentParts.push(`Total Results: ${summaryData.totalResults}`);
      }
      
      if (typeof summaryData.processingTimeMs === 'number') {
        contentParts.push(`Processing Time: ${summaryData.processingTimeMs}ms`);
      }

      if (Array.isArray(summaryData.topTerms) && summaryData.topTerms.length > 0) {
        contentParts.push('', 'Top Terms:');
        summaryData.topTerms.forEach(term => {
          if (term && typeof term.term === 'string' && typeof term.count === 'number') {
            contentParts.push(`- ${term.term} (${term.count} occurrences)`);
          }
        });
      }

      if (summaryData.dateRange) {
        contentParts.push('', `Date Range: ${summaryData.dateRange.start} to ${summaryData.dateRange.end}`);
      }

      const formattedContent = contentParts.join('\n');
      
      return {
        success: true,
        content: formattedContent || "No summary data available",
        summary: `Found ${summaryData.totalResults || 0} results${
          typeof summaryData.processingTimeMs === 'number' ? ` in ${summaryData.processingTimeMs}ms` : ''
        }`,
        details: `Search summary for "${query}"${date ? ` as of ${date}` : ""}${
          title ? ` in Title ${title}` : ""
        }${agency_slugs?.length ? ` filtered by agencies: ${agency_slugs.join(", ")}` : ""}${
          Array.isArray(summaryData.topTerms) ? ` with ${summaryData.topTerms.length} top terms` : ''
        }`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Search summary error:", errorMessage);
      return {
        success: false,
        content: errorMessage,
        summary: "Failed to get search summary",
        details: `Error getting search summary: ${errorMessage}`
      };
    }
  }
});