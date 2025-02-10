import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({});

type Params = z.infer<typeof params>;

type TitleInfo = {
  number: string;
  name: string;
  type: string;
  status: string;
  lastAmendDate: string;
  lastPublishDate: string;
};

type Result = {
  success: boolean;
  titles?: TitleInfo[];
  error?: string;
  summary: string;
  details: string;
};

export const listTitlesTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get summary information about each title's status and metadata",
  parameters: params,
  execute: async ({}: Params): Promise<Result> => {
    try {
      const response = await fetch(
        "https://www.ecfr.gov/api/versioner/v1/titles.json"
      );

      if (!response.ok) {
        throw new Error(`Titles API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        titles: data.titles,
        summary: `Retrieved information for ${data.titles.length} titles`,
        details: "Complete list of eCFR titles with status and metadata"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to fetch titles information",
        details: `Error fetching eCFR titles: ${errorMessage}`
      };
    }
  }
});