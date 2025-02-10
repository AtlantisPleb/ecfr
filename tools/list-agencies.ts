import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({});

type Params = z.infer<typeof params>;

type Agency = {
  name: string;
  short_name: string;
  slug: string;
  display_name: string;
  parent_id?: string;
  children?: Agency[];
};

type Result = {
  success: boolean;
  agencies?: Agency[];
  error?: string;
  summary: string;
  details: string;
};

export const listAgenciesTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get list of all federal agencies with their hierarchical relationships",
  parameters: params,
  execute: async (): Promise<Result> => {
    try {
      const response = await fetch(
        "https://www.ecfr.gov/api/admin/v1/agencies.json"
      );

      if (!response.ok) {
        throw new Error(`Agencies API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        agencies: data.agencies,
        summary: `Retrieved ${data.agencies.length} federal agencies`,
        details: "Full hierarchical list of federal agencies with parent/child relationships"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to retrieve agencies",
        details: `Error fetching agency list: ${errorMessage}`
      };
    }
  }
});