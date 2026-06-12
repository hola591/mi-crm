import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { prompt, system, maxTokens } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens ?? 1024,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  const text = content.type === "text" ? content.text : "";

  return NextResponse.json({ text });
}
