import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { toAnthropicTools, executeTool, AgentToolContext } from "./mcp-tools";
import { buildAgentSystemPrompt } from "./system-prompt";

export interface AgentMessage {
  role:    "user" | "assistant";
  content: string;
}

export interface AgentLoopResult {
  response:         string;
  toolsUsed:        string[];
  actionsPerformed: string[];
  iterations:       number;
}

export async function runAgentLoop(
  userMessage: string,
  history: AgentMessage[],
  ctx: AgentToolContext & {
    orgName:      string;
    userRole:     string;
    projectId?:   string;
    projectName?: string;
  },
): Promise<AgentLoopResult> {
  const MAX_ITERATIONS     = 10;
  const toolsUsed:        string[] = [];
  const actionsPerformed: string[] = [];

  const systemPrompt = buildAgentSystemPrompt({
    orgName:     ctx.orgName,
    userRole:    ctx.userRole,
    projectId:   ctx.projectId,
    projectName: ctx.projectName,
  });

  // Build message history for Claude
  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  let iteration     = 0;
  let finalResponse = "";

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await anthropic.messages.create({
      model:      process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 2000,
      system:     systemPrompt,
      tools:      toAnthropicTools() as Anthropic.Tool[],
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined;
      finalResponse = textBlock?.text ?? "";
      break;
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content as Anthropic.ContentBlock[] });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        toolsUsed.push(block.name);
        console.log(`[agent] iteration ${iteration}: calling ${block.name}`);

        try {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            ctx,
          );

          if (result && typeof result === "object" && (result as any).success) {
            actionsPerformed.push((result as any).message ?? block.name);
          }

          toolResults.push({
            type:        "tool_result" as const,
            tool_use_id: block.id,
            content:     JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            type:        "tool_result" as const,
            tool_use_id: block.id,
            content:     JSON.stringify({ error: String(err) }),
            is_error:    true,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason — extract any text and break
    const textBlock = response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined;
    if (textBlock) finalResponse = textBlock.text;
    break;
  }

  if (!finalResponse && iteration >= MAX_ITERATIONS) {
    finalResponse = "Analysis complete. Let me know if you need anything else.";
  }

  return { response: finalResponse, toolsUsed, actionsPerformed, iterations: iteration };
}
