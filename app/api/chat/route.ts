import { StreamingTextResponse, Message, convertToCoreMessages } from "ai"
import Anthropic from '@anthropic-ai/sdk'
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

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const toolContext = new ToolContext(
      { modelId: "claude-3-sonnet" }
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
    
    const stream = await anthropic.messages.create({
      messages: [
        {
          role: "user",
          content: systemPrompt
        },
        ...messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ],
      model: "claude-3-sonnet",
      max_tokens: 1024,
      stream: true,
      tools: Object.values(tools).map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))
    })

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