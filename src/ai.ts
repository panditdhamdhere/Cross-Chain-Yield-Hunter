/**
 * AI service for Cross-Chain Yield Hunter
 * Supports Groq (free) and OpenAI for decision augmentation and natural language Q&A
 * Prefers GROQ_API_KEY when set; falls back to OPENAI_API_KEY
 */

import OpenAI from 'openai';
import { logger } from './logger.js';
import type { YieldOpportunity, QuoteEstimate } from './types.js';

let client: OpenAI | null = null;
let provider: 'groq' | 'openai' = 'openai';

export function initAi(openaiKey?: string, groqKey?: string): boolean {
  const groq = groqKey ?? process.env.GROQ_API_KEY?.trim();
  const openai = openaiKey ?? process.env.OPENAI_API_KEY?.trim();
  if (groq) {
    client = new OpenAI({ apiKey: groq, baseURL: 'https://api.groq.com/openai/v1' });
    provider = 'groq';
    logger.info('AI service initialized (Groq, free tier)');
    return true;
  }
  if (openai) {
    client = new OpenAI({ apiKey: openai });
    provider = 'openai';
    logger.info('AI service initialized (OpenAI)');
    return true;
  }
  logger.info('GROQ_API_KEY and OPENAI_API_KEY not set — AI features disabled, using rule-based logic');
  return false;
}

export function isAiEnabled(): boolean {
  return client !== null;
}

const CHAT_MODEL = { groq: 'llama-3.1-8b-instant', openai: 'gpt-4o-mini' } as const;

/**
 * Get AI recommendation for rebalance decision
 * Returns structured advice: { action: 'rebalance'|'hold', reasoning: string }
 * Returns null if AI is disabled or call fails (caller should use rule-based fallback)
 */
export async function getRebalanceRecommendation(params: {
  opportunities: YieldOpportunity[];
  currentPosition: { chain: string; protocol: string; apy: number } | null;
  bestOpportunity: YieldOpportunity;
  apyGain: number;
  netApyAfterFees?: number;
  quoteEstimate?: QuoteEstimate | null;
  minApyDifferential: number;
}): Promise<{ action: 'rebalance' | 'hold'; reasoning: string } | null> {
  if (!client) return null;

  const {
    opportunities,
    currentPosition,
    bestOpportunity,
    apyGain,
    netApyAfterFees,
    quoteEstimate,
    minApyDifferential,
  } = params;

  const topOpps = opportunities.slice(0, 5).map((o) => ({
    chain: o.chain,
    protocol: o.protocol,
    symbol: o.symbol,
    apy: o.apy.toFixed(2),
    tvlUsd: o.tvlUsd,
  }));

  const prompt = `You are a DeFi yield optimization advisor. Given current yield opportunities and the user's position, recommend whether to rebalance or hold.

Current position: ${currentPosition ? `${currentPosition.chain} ${currentPosition.protocol} (${currentPosition.apy.toFixed(2)}% APY)` : 'None (new capital)'}
Best opportunity: ${bestOpportunity.chain} ${bestOpportunity.protocol} ${bestOpportunity.symbol} (${bestOpportunity.apy.toFixed(2)}% APY, TVL $${(bestOpportunity.tvlUsd / 1e6).toFixed(2)}M)
APY gain: ${apyGain.toFixed(2)}%
Net APY after bridge fees: ${netApyAfterFees != null ? netApyAfterFees.toFixed(2) + '%' : 'N/A'}
Min APY differential threshold: ${minApyDifferential}%

Top 5 opportunities:
${JSON.stringify(topOpps, null, 2)}

Respond with JSON only, no markdown:
{"action": "rebalance" or "hold", "reasoning": "Brief explanation (1-2 sentences)"}`;

  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL[provider],
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON from response (handle possible markdown code blocks)
    const jsonStr = content.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(jsonStr) as { action?: string; reasoning?: string };
    const action = parsed.action === 'rebalance' ? 'rebalance' : 'hold';
    const reasoning = parsed.reasoning ?? 'No reasoning provided';
    return { action, reasoning };
  } catch (err) {
    logger.warn({ err }, 'AI rebalance recommendation failed');
    return null;
  }
}

/**
 * Answer a natural language question about yield opportunities
 * Used by the dashboard chat (Step 3)
 */
export async function answerYieldQuestion(
  question: string,
  opportunities: YieldOpportunity[]
): Promise<string | null> {
  if (!client) return null;

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

  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL[provider],
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    logger.warn({ err }, 'AI yield question failed');
    return null;
  }
}
