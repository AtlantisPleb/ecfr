import { StreamingTextResponse, Message } from "ai"
import { experimental_buildAnthropicStream } from "ai/streams"
import { getTools } from "@/tools"
import { ToolContext } from "@/types"

// Remove edge runtime to see console logs
// export const runtime = "edge"

export async function POST(req: Request) {
  console.log("Chat API hit")
  
  try {
    const json = await req.json()
    console.log("Request body:", json)

    const { messages } = json
    
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set")
      return new Response("Server configuration error - Missing API key", { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    const toolContext = new ToolContext(
      { modelId: "claude-3-5-sonnet-20241022" }
    )

    const tools = getTools(toolContext, ["search_results", "list_agencies"])
    console.log("Initialized tools:", Object.keys(tools))

    const systemPrompt = `You are an AI assistant helping users understand federal regulations.
Use the provided tools to search and analyze regulations:
- search_results: Search eCFR content using natural language queries
- list_agencies: Get list of federal agencies and their relationships

Always cite specific regulations when providing information.
If you're not sure about something, say so.
Keep responses clear and concise.`

    console.log("Making request to Anthropic")
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
        ],
        stream: true,
        tools: Object.values(tools).map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Anthropic API error:", error)
      return new Response(JSON.stringify({ error: "Error from AI service" }), { 
        status: response.status,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    console.log("Got response from Anthropic, building stream")
    const stream = experimental_buildAnthropicStream(response)
    return new StreamingTextResponse(stream)
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