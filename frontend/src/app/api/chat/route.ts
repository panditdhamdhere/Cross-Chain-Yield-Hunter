import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { scanYields } from '@/lib/yield-scanner';
import type { YieldOpportunity } from '@/lib/yield-scanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY not configured. Add it to your .env.local for AI chat.' },
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

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
