/**
 * Common token addresses by chain (for quote requests)
 * USDC is the primary stablecoin we use for cross-chain yield
 */

export const USDC_BY_CHAIN: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',      // Ethereum
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',     // Optimism
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',    // Polygon
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',  // Arbitrum (native)
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Base
};

export const NATIVE_ETH = '0x0000000000000000000000000000000000000000';

export function getUsdcAddress(chainId: number): string | null {
  return USDC_BY_CHAIN[chainId] ?? null;
}
