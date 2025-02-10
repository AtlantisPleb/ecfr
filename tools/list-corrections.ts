import { CoreTool, tool } from "ai"
import { z } from "zod"
import { ToolContext } from "@/types"

const params = z.object({
  title: z.string().optional().describe("Optional title number to filter corrections"),
  effectiveDate: z.string().optional().describe("Optional date to filter by when corrections became effective (YYYY-MM-DD)"),
  correctionDate: z.string().optional().describe("Optional date to filter by when corrections were made (YYYY-MM-DD)")
});

type Params = z.infer<typeof params>;

type Correction = {
  title: string;
  part: string;
  section: string;
  effectiveDate: string;
  correctionDate: string;
  description: string;
  url: string;
};

type Result = {
  success: boolean;
  corrections?: Correction[];
  error?: string;
  summary: string;
  details: string;
};

export const listCorrectionsTool = (context: ToolContext): CoreTool<typeof params, Result> => tool({
  description: "Get all eCFR corrections with optional filtering by title, effective date, or correction date",
  parameters: params,
  execute: async ({ title, effectiveDate, correctionDate }: Params): Promise<Result> => {
    try {
      const searchParams = new URLSearchParams({
        ...(title && { title }),
        ...(effectiveDate && { effectiveDate }),
        ...(correctionDate && { correctionDate })
      });

      const url = title 
        ? `https://www.ecfr.gov/api/admin/v1/corrections/title/${title}.json`
        : `https://www.ecfr.gov/api/admin/v1/corrections.json${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Corrections API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        corrections: data.corrections,
        summary: `Found ${data.corrections.length} corrections${title ? ` for Title ${title}` : ''}`,
        details: `Corrections list${title ? ` for Title ${title}` : ''}${
          effectiveDate ? ` effective from ${effectiveDate}` : ''
        }${correctionDate ? ` corrected on ${correctionDate}` : ''}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        summary: "Failed to fetch corrections",
        details: `Error fetching eCFR corrections: ${errorMessage}`
      };
    }
  }
});