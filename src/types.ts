/**
 * Cross-Chain Yield Hunter - Type definitions
 */

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
  underlyingToken: string;
  project: string;
}

export interface QuoteEstimate {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin?: string;
  gasCosts?: { total: string; token: string }[];
  executionDuration?: number;
  feeCosts?: Array<{ amount: string; token: string }>;
}

export interface RebalanceDecision {
  action: 'rebalance' | 'hold';
  reason: string;
  fromOpportunity?: YieldOpportunity;
  toOpportunity?: YieldOpportunity;
  estimatedNetApyGain: number;
  quoteEstimate?: QuoteEstimate;
}

export interface AgentConfig {
  privateKey: string;
  lifiApiKey?: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  minApyDifferential: number;
  minPositionUsd: number;
  maxPositionUsd: number;
  scanIntervalMinutes: number;
  dryRun: boolean;
  allowedChains: number[];
  allowedProtocols: string[];
  /** Chain where capital starts when no position (default: Arbitrum) */
  initialChainId?: number;
}

export interface AgentState {
  lastScanAt: string;
  currentPosition: {
    chainId: number;
    protocol: string;
    symbol: string;
    apy: number;
  } | null;
  totalRebalances: number;
  lastRebalanceAt: string | null;
}
