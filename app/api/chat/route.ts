import { StreamingTextResponse, Message, convertToCoreMessages, streamText } from "ai"
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
    
    const coreMessages = convertToCoreMessages(messages)
    const result = await streamText({
      messages: coreMessages,
      model: toolContext.model,
      system: systemPrompt,
      tools,
      onFinish: (completion) => {
        console.log("Chat completion finished:", completion)
      },
    })

    return result.toDataStreamResponse()
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