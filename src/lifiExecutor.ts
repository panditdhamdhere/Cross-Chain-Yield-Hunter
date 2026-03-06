/**
 * LI.FI executor - quotes, execution, status tracking
 * Uses LI.FI REST API for quotes + SDK for execution (Composer)
 */

import { createConfig, convertQuoteToRoute, executeRoute, EVM } from '@lifi/sdk';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Chain } from 'viem';
import { mainnet, arbitrum, base, optimism, polygon } from 'viem/chains';
import { getUsdcAddress } from './tokens.js';
import { logger } from './logger.js';
import type { QuoteEstimate, YieldOpportunity } from './types.js';

const LIFI_API = 'https://li.quest/v1';
const CHAINS: Record<number, Chain> = {
  1: mainnet,
  10: optimism,
  137: polygon,
  42161: arbitrum,
  8453: base,
};

interface LiFiQuoteResponse {
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: { address: string };
    toToken: { address: string };
    fromAmount: string;
    toAmount: string;
  };
  estimate?: {
    toAmount?: string;
    toAmountMin?: string;
    gasCosts?: { total: string }[];
    executionDuration?: number;
  };
  transactionRequest?: Record<string, unknown>;
}

let lifiInitialized = false;

export function initLifi(privateKey: string, apiKey?: string) {
  if (lifiInitialized) return;

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const chainList = Object.values(CHAINS);

  createConfig({
    integrator: 'cross-chain-yield-hunter',
    apiKey: apiKey || undefined,
    providers: [
      EVM({
        getWalletClient: async () =>
          createWalletClient({
            account,
            chain: mainnet,
            transport: http(),
          }),
        switchChain: async (chainId) =>
          createWalletClient({
            account,
            chain: chainList.find((c) => c.id === chainId) ?? mainnet,
            transport: http(),
          }) as ReturnType<typeof createWalletClient>,
      }),
    ],
  });

  lifiInitialized = true;
  logger.info('LI.FI SDK initialized');
}

/**
 * Get quote via REST API (reliable for agents)
 */
async function fetchQuote(params: {
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  apiKey?: string;
}): Promise<LiFiQuoteResponse | null> {
  const url = new URL(`${LIFI_API}/quote`);
  url.searchParams.set('fromChain', String(params.fromChainId));
  url.searchParams.set('toChain', String(params.toChainId));
  url.searchParams.set('fromToken', params.fromToken);
  url.searchParams.set('toToken', params.toToken);
  url.searchParams.set('fromAmount', params.fromAmount);
  url.searchParams.set('fromAddress', params.fromAddress);
  url.searchParams.set('slippage', '0.005');
  url.searchParams.set('allowDestinationCall', 'true');

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (params.apiKey) {
    headers['X-LiFi-Api-Key'] = params.apiKey;
  }

  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, body: text }, 'Quote API error');
      return null;
    }
    return (await res.json()) as LiFiQuoteResponse;
  } catch (err) {
    logger.warn({ err }, 'Quote fetch failed');
    return null;
  }
}

/**
 * Estimate cost/output for a rebalance (for decision logic)
 */
export async function estimateRebalanceCost(params: {
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  fromAddress: string;
  toOpportunity: YieldOpportunity;
  apiKey?: string;
}): Promise<QuoteEstimate | null> {
  const fromToken = getUsdcAddress(params.fromChainId);
  if (!fromToken) return null;
  if (!params.toOpportunity.vaultTokenAddress) return null;

  const quote = await fetchQuote({
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromToken,
    toToken: params.toOpportunity.vaultTokenAddress,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    apiKey: params.apiKey,
  });

  if (!quote?.action) return null;

  const a = quote.action;
  const e = quote.estimate;

  return {
    fromChain: a.fromChainId,
    toChain: a.toChainId,
    fromToken: a.fromToken.address,
    toToken: a.toToken.address,
    fromAmount: a.fromAmount,
    toAmount: e?.toAmount ?? a.toAmount ?? '0',
    toAmountMin: e?.toAmountMin ?? a.toAmount ?? '0',
    gasCosts: e?.gasCosts as { total: string; token: string }[] | undefined,
    executionDuration: e?.executionDuration,
  };
}

/**
 * Execute a cross-chain vault deposit via LI.FI SDK
 * Uses SDK getQuote for proper Route conversion (REST quote shape differs)
 */
export async function executeVaultDeposit(params: {
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toVaultAddress: string;
  fromAmount: string;
  fromAddress: string;
  apiKey?: string;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  let route;
  try {
    const { getQuote } = await import('@lifi/sdk');
    const quote = await getQuote({
      fromChain: params.fromChainId,
      toChain: params.toChainId,
      fromToken: params.fromToken,
      toToken: params.toVaultAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      slippage: 0.005,
    });
    route = convertQuoteToRoute(quote);
  } catch (err) {
    logger.warn({ err }, 'SDK getQuote failed, cannot execute');
    return { success: false, error: (err as Error).message };
  }

  try {
    const result = await executeRoute(route, {
      updateRouteHook(updatedRoute) {
        for (const step of updatedRoute.steps) {
          const proc = step.execution?.process?.slice(-1)[0];
          if (proc) {
            logger.info(
              { tool: step.tool, status: proc.status, txHash: proc.txHash },
              'Route step update'
            );
          }
        }
      },
      acceptExchangeRateUpdateHook() {
        return Promise.resolve(true);
      },
    });

    const lastStep = result.steps[result.steps.length - 1];
    const lastProc = lastStep?.execution?.process?.slice(-1)[0];
    const txHash = lastProc?.txHash ?? result.steps[0]?.execution?.process?.[0]?.txHash;

    return { success: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, params }, 'Execute route failed');
    return { success: false, error: msg };
  }
}
