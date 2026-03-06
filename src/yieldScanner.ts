/**
 * Yield scanner - fetches APY data from DefiLlama and maps to LI.FI vaults
 */

import { getLifiChainId } from './chainMap.js';
import { getVaultAddress } from './vaults.js';
import { logger } from './logger.js';
import type { YieldOpportunity } from './types.js';

const DEFILLAMA_POOLS_URL = 'https://yields.llama.fi/pools';

interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  pool: string;
  underlyingTokens?: string[] | null;
}

interface DefiLlamaResponse {
  status: string;
  data: DefiLlamaPool[];
}

/** Protocols we support (LI.FI Composer compatible) */
const SUPPORTED_PROJECTS = ['morpho', 'aave-v3', 'euler', 'pendle', 'seamless'];

/** Minimum TVL to consider (avoid illiquid pools) */
const MIN_TVL_USD = 100_000;

/** Stablecoin symbols we prioritize for cross-chain yield hunting */
const STABLECOIN_SYMBOLS = new Set([
  'USDC',
  'USDT',
  'DAI',
  'USDC.E',
  'USDT.E',
  'AUSDC',
  'AARBUSDC',
  'ABASUSDC',
]);

function isStablecoinRelated(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return (
    STABLECOIN_SYMBOLS.has(upper) ||
    upper.includes('USDC') ||
    upper.includes('USDT') ||
    upper.includes('DAI')
  );
}

export async function scanYields(
  options: {
    minTvlUsd?: number;
    protocols?: string[];
    chains?: number[];
  } = {}
): Promise<YieldOpportunity[]> {
  const { minTvlUsd = MIN_TVL_USD } = options;

  logger.info({ url: DEFILLAMA_POOLS_URL }, 'Fetching yield pools from DefiLlama');

  const res = await fetch(DEFILLAMA_POOLS_URL, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`DefiLlama API error: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as DefiLlamaResponse;
  if (body.status !== 'success' || !Array.isArray(body.data)) {
    throw new Error('Invalid DefiLlama response');
  }

  const opportunities: YieldOpportunity[] = [];
  const seen = new Set<string>();

  for (const pool of body.data as DefiLlamaPool[]) {
    const project = pool.project?.toLowerCase();
    if (!SUPPORTED_PROJECTS.includes(project)) continue;
    if (pool.tvlUsd < minTvlUsd) continue;
    if (!pool.apy || pool.apy < 0.01) continue;

    const chainId = getLifiChainId(pool.chain);
    if (!chainId) continue;

    if (options.chains?.length && !options.chains.includes(chainId)) continue;
    if (options.protocols?.length && !options.protocols.includes(project)) continue;

    // Prefer stablecoin pools for cross-chain (lower volatility)
    if (!isStablecoinRelated(pool.symbol)) continue;

    // Map to vault address - try multiple symbol variants
    let vaultAddress: string | null = null;
    for (const sym of [pool.symbol, 'USDC', pool.symbol.replace(/^a/i, '')]) {
      vaultAddress = getVaultAddress(chainId, project, sym);
      if (vaultAddress) break;
    }

    if (!vaultAddress) continue;

    const key = `${chainId}-${project}-${pool.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);

    opportunities.push({
      poolId: pool.pool,
      chain: pool.chain,
      chainId,
      protocol: project,
      symbol: pool.symbol,
      apy: pool.apy,
      apyBase: pool.apyBase ?? null,
      apyReward: pool.apyReward ?? null,
      tvlUsd: pool.tvlUsd,
      vaultTokenAddress: vaultAddress,
      underlyingToken: pool.symbol,
      project,
    });
  }

  opportunities.sort((a, b) => b.apy - a.apy);
  logger.info(
    { count: opportunities.length, top: opportunities.slice(0, 5).map((o) => `${o.chain} ${o.protocol} ${o.apy.toFixed(2)}%`) },
    'Yield scan complete'
  );

  return opportunities;
}
