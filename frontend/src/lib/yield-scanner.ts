/**
 * Yield scanner - fetches APY data from DefiLlama
 * Shared logic for frontend (no agent deps)
 */

const DEFILLAMA_POOLS_URL = 'https://yields.llama.fi/pools';

const DEFILLAMA_TO_LIFI_CHAIN: Record<string, number> = {
  Ethereum: 1,
  Arbitrum: 42161,
  Optimism: 10,
  Base: 8453,
  Polygon: 137,
};

const SUPPORTED_PROJECTS = ['morpho', 'aave-v3', 'euler', 'pendle', 'seamless'];
const SUPPORTED_CHAINS = new Set([1, 10, 137, 42161, 8453]);

function hasVaultSupport(chainId: number, protocol: string): boolean {
  return SUPPORTED_CHAINS.has(chainId) && ['morpho', 'aave-v3'].includes(protocol);
}

function isStablecoinRelated(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return (
    upper.includes('USDC') || upper.includes('USDT') || upper.includes('DAI') || upper.includes('AUSDC') || upper.includes('APOL')
  );
}

export interface YieldOpportunity {
  poolId: string;
  chain: string;
  chainId: number;
  protocol: string;
  symbol: string;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number;
  vaultTokenAddress: string | null;
  project: string;
}

interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  pool: string;
}

export async function scanYields(minTvlUsd = 100_000): Promise<YieldOpportunity[]> {
  const res = await fetch(DEFILLAMA_POOLS_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`DefiLlama API error: ${res.status}`);

  const body = (await res.json()) as { status: string; data: DefiLlamaPool[] };
  if (body.status !== 'success' || !Array.isArray(body.data)) throw new Error('Invalid DefiLlama response');

  const opportunities: YieldOpportunity[] = [];
  const seen = new Set<string>();

  for (const pool of body.data) {
    const project = pool.project?.toLowerCase();
    if (!SUPPORTED_PROJECTS.includes(project)) continue;
    if (pool.tvlUsd < minTvlUsd) continue;
    if (!pool.apy || pool.apy < 0.01) continue;

    const chainId = DEFILLAMA_TO_LIFI_CHAIN[pool.chain];
    if (!chainId) continue;

    if (!isStablecoinRelated(pool.symbol)) continue;
    if (!hasVaultSupport(chainId, project)) continue;

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
      vaultTokenAddress: null,
      project,
    });
  }

  opportunities.sort((a, b) => b.apy - a.apy);
  return opportunities;
}
