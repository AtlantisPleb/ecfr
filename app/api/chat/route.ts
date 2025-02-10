import {
  convertToCoreMessages, Message, StreamData, streamText
} from "ai"
import { getTools } from "@/tools"
import { ToolContext } from "@/types"
import { anthropic } from "@ai-sdk/anthropic"

// Remove edge runtime to see console logs
// export const runtime = "edge"

export async function POST(req: Request) {
  console.log("Chat API hit")

  try {
    const json = await req.json()
    console.log("Request body:", json)

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set")
      return new Response("Server configuration error - Missing API key", {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    const systemPrompt = `You are an AI assistant helping users understand federal regulations.
Use the provided tools to search and analyze regulations:

Search Tools:
- search_results: Search eCFR content using natural language queries
- search_count: Get total count of search results
- search_summary: Get summary details and top terms
- search_counts: Get results grouped by date/title/hierarchy
- search_suggestions: Get search term suggestions

Navigation Tools:
- list_agencies: Get list of federal agencies and relationships
- list_titles: Get summary of all CFR titles
- get_title_ancestry: Get complete ancestry from any level
- get_title_structure: Get title structure (without content)
- get_title_full: Get complete title content in XML

Administrative Tools:
- list_corrections: Get eCFR corrections with filtering options

Always cite specific regulations when providing information.
If you're not sure about something, say so.
Keep responses clear and concise.
Use the most appropriate tool(s) for each query.`

    const toolContext = new ToolContext(
      { modelId: 'claude-3-5-sonnet-20241022' }
    )

    const tools = getTools(toolContext, [
      "search_results",
      "search_count",
      "search_summary",
      "search_counts",
      "search_suggestions",
      "list_agencies",
      "list_titles",
      "get_title_ancestry",
      "get_title_structure",
      "get_title_full",
      "list_corrections"
    ])

    console.log("Initialized tools:", Object.keys(tools))

    const messages = convertToCoreMessages(json.messages as Message[])
    const data = new StreamData()

    console.log("Making request to Anthropic")
    const result = await streamText({
      messages,
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: systemPrompt,
      tools,
      onFinish: () => {
        console.log('Closing data stream')
        data.close()
      }
    })

    return result.toDataStreamResponse({ data });

  } catch (error) {
    console.error("Error in chat route:", error)
    return new Response(JSON.stringify({ error: "Error processing chat request" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}