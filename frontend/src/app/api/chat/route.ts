import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { scanYields } from '@/lib/yield-scanner';
import type { YieldOpportunity } from '@/lib/yield-scanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function getAiClient(): { client: OpenAI; model: string } | null {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (groqKey) {
    return { client: new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' }), model: 'llama-3.1-8b-instant' };
  }
  if (openaiKey) {
    return { client: new OpenAI({ apiKey: openaiKey }), model: 'gpt-4o-mini' };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const ai = getAiClient();
    if (!ai) {
      return NextResponse.json(
        { success: false, error: 'Add GROQ_API_KEY (free) or OPENAI_API_KEY to .env.local for AI chat. Get Groq key at console.groq.com' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    let opportunities: YieldOpportunity[] = body.opportunities;
    if (!Array.isArray(opportunities) || opportunities.length === 0) {
      opportunities = await scanYields(100_000);
    }

    const oppsSummary = opportunities.slice(0, 15).map((o) => ({
      chain: o.chain,
      protocol: o.protocol,
      symbol: o.symbol,
      apy: o.apy.toFixed(2),
      tvlUsd: o.tvlUsd,
    }));

    const prompt = `You are a DeFi yield advisor for the Cross-Chain Yield Hunter. Answer the user's question based on the current yield opportunities.

Current opportunities (top 15 by APY):
${JSON.stringify(oppsSummary, null, 2)}

User question: ${question}

Respond in 2-4 sentences. Be concise and helpful. Focus on chains, protocols, APYs, and TVL when relevant.`;

    const completion = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? 'Could not generate a response.';
    return NextResponse.json({ success: true, answer });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
