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
  content: string;
  summary: string;
  details: string;
};

export const searchResultsTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Search eCFR content using the provided query",
  parameters: params,
  execute: async ({ query, date, title, agency_slugs }: Params): Promise<Result> => {
    console.log('========= SEARCH TOOL START =========');
    console.log('Search parameters:', { query, date, title, agency_slugs });

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

      const url = `https://www.ecfr.gov/api/search/v1/results?${searchParams.toString()}`;
      console.log("Making search request to:", url);

      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Search API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });

        if (response.status === 400) {
          const errorResult = {
            success: false,
            content: errorText,
            summary: "Search query validation failed",
            details: `The search API rejected the query: ${errorText}`
          };
          console.log('Returning error result:', errorResult);
          console.log('========= SEARCH TOOL END (ERROR) =========');
          return errorResult;
        }

        throw new Error(`Search API returned ${response.status}: ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data);

      const results = data.results as SearchResult[];
      console.log(`Found ${results.length} results`);
      
      // Format the content as a readable string
      const formattedResults = results.map(result => {
        const { hierarchy, section, content, url } = result;
        return `${hierarchy.title} > ${hierarchy.chapter} > ${hierarchy.part} ${hierarchy.subpart ? `> ${hierarchy.subpart}` : ''} > ${section}\n${content}\nURL: ${url}\n`;
      }).join('\n---\n\n');

      const resultSummary = `Found ${results.length} matching regulations`;
      const resultDetails = `Search results for query "${query}"${date ? ` as of ${date}` : ""}${
        title ? ` in Title ${title}` : ""
      }${agency_slugs?.length ? ` filtered by agencies: ${agency_slugs.join(", ")}` : ""}`;

      const result = {
        success: true,
        content: formattedResults,
        summary: resultSummary,
        details: resultDetails
      };

      console.log('Returning success result:', result);
      console.log('========= SEARCH TOOL END (SUCCESS) =========');
      
      return {
        success: true,
        content: formattedResults,
        summary: resultSummary,
        details: resultDetails
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Search error:", errorMessage);
      
      const errorResult = {
        success: false,
        content: errorMessage,
        summary: "Failed to search regulations",
        details: `Error searching eCFR content: ${errorMessage}`
      };

      console.log('Returning error result:', errorResult);
      console.log('========= SEARCH TOOL END (ERROR) =========');
      
      return errorResult;
    }
  }
});