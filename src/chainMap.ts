/**
 * Maps DefiLlama chain names to LI.FI chain IDs
 * @see https://docs.li.fi/agents/overview
 */

export const DEFILLAMA_TO_LIFI_CHAIN: Record<string, number> = {
  Ethereum: 1,
  Arbitrum: 42161,
  Optimism: 10,
  Base: 8453,
  Polygon: 137,
  BSC: 56,
  Avalanche: 43114,
  Gnosis: 100,
  Fantom: 250,
  zkSync: 324,
  'zkSync Era': 324,
  Linea: 59144,
  Scroll: 534352,
  Blast: 81457,
  Mode: 34443,
  Mantle: 5000,
};

export const LIFI_TO_DEFILLAMA_CHAIN: Record<number, string> = Object.fromEntries(
  Object.entries(DEFILLAMA_TO_LIFI_CHAIN).map(([k, v]) => [v, k])
);

/** Chains we actively support for yield hunting (EVM, good liquidity) */
export const SUPPORTED_CHAINS = [
  1,      // Ethereum
  42161,  // Arbitrum
  10,     // Optimism
  8453,   // Base
  137,    // Polygon
] as const;

export function getLifiChainId(defiLlamaChain: string): number | null {
  return DEFILLAMA_TO_LIFI_CHAIN[defiLlamaChain] ?? null;
}
