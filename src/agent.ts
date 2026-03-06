/**
 * Cross-Chain Yield Hunter Agent
 * Autonomous loop: scan → decide → execute
 */

import { scanYields } from './yieldScanner.js';
import { estimateRebalanceCost, executeVaultDeposit } from './lifiExecutor.js';
import { getUsdcAddress } from './tokens.js';
import { LIFI_TO_DEFILLAMA_CHAIN } from './chainMap.js';
import { getRebalanceRecommendation } from './ai.js';
import { logger } from './logger.js';
import type { AgentConfig, AgentState, QuoteEstimate, RebalanceDecision, YieldOpportunity } from './types.js';

export class YieldHunterAgent {
  private config: AgentConfig;
  private state: AgentState;

  constructor(config: AgentConfig) {
    this.config = config;
    this.state = {
      lastScanAt: new Date(0).toISOString(),
      currentPosition: null,
      totalRebalances: 0,
      lastRebalanceAt: null,
    };
  }

  async scan(): Promise<YieldOpportunity[]> {
    const opportunities = await scanYields({
      minTvlUsd: this.config.minPositionUsd,
      protocols: this.config.allowedProtocols,
      chains: this.config.allowedChains,
    });

    this.state.lastScanAt = new Date().toISOString();
    return opportunities;
  }

  /**
   * Decide whether to rebalance from current position to a better opportunity
   */
  async decide(
    opportunities: YieldOpportunity[],
    currentPosition: AgentState['currentPosition'],
    fromAddress: string
  ): Promise<RebalanceDecision> {
    if (opportunities.length === 0) {
      return { action: 'hold', reason: 'No yield opportunities found', estimatedNetApyGain: 0 };
    }

    const best = opportunities[0];
    if (!best?.vaultTokenAddress) {
      return {
        action: 'hold',
        reason: 'Best opportunity has no vault address',
        toOpportunity: best,
        estimatedNetApyGain: 0,
      };
    }

    const currentApy = currentPosition?.apy ?? 0;
    const apyGain = best.apy - currentApy;

    if (apyGain < this.config.minApyDifferential) {
      return {
        action: 'hold',
        reason: `APY gain ${apyGain.toFixed(2)}% below threshold ${this.config.minApyDifferential}%`,
        toOpportunity: best,
        estimatedNetApyGain: apyGain,
      };
    }

    const fromChainId = currentPosition?.chainId ?? this.config.initialChainId ?? 42161;
    const fromAmount = this.formatUsdcAmount(this.config.minPositionUsd);
    const fromToken = getUsdcAddress(fromChainId);

    if (!fromToken) {
      return {
        action: 'hold',
        reason: `No USDC address for chain ${fromChainId}`,
        toOpportunity: best,
        estimatedNetApyGain: apyGain,
      };
    }

    // Try opportunities by APY; get quote for first that succeeds
    let quoteEstimate: Awaited<ReturnType<typeof estimateRebalanceCost>> = null;
    let chosenOpportunity = best;

    for (const opp of opportunities.slice(0, 8)) {
      if (!opp.vaultTokenAddress) continue;
      const fromTok = getUsdcAddress(fromChainId);
      if (!fromTok) continue;

      quoteEstimate = await estimateRebalanceCost({
        fromChainId,
        toChainId: opp.chainId,
        fromAmount,
        fromAddress,
        toOpportunity: opp,
        apiKey: this.config.lifiApiKey,
      });
      if (quoteEstimate) {
        chosenOpportunity = opp;
        break;
      }
    }

    if (!quoteEstimate) {
      return {
        action: 'hold',
        reason: 'Could not get LI.FI quote for any opportunity',
        toOpportunity: best,
        estimatedNetApyGain: apyGain,
      };
    }

    const netApyAfterFees = this.estimateNetApyAfterBridgeCost(
      chosenOpportunity.apy,
      quoteEstimate,
      this.config.minPositionUsd
    );

    if (netApyAfterFees < currentApy + this.config.minApyDifferential) {
      return {
        action: 'hold',
        reason: `Net APY after bridge cost (${netApyAfterFees.toFixed(2)}%) insufficient`,
        fromOpportunity: currentPosition ? this.positionToOpportunity(currentPosition) : undefined,
        toOpportunity: chosenOpportunity,
        estimatedNetApyGain: netApyAfterFees - currentApy,
        quoteEstimate,
      };
    }

    // AI augmentation: get LLM recommendation when rule-based logic suggests rebalance
    const currentPosForAi = currentPosition
      ? {
          chain: LIFI_TO_DEFILLAMA_CHAIN[currentPosition.chainId] ?? '',
          protocol: currentPosition.protocol,
          apy: currentPosition.apy,
        }
      : null;

    const aiRec = await getRebalanceRecommendation({
      opportunities,
      currentPosition: currentPosForAi,
      bestOpportunity: chosenOpportunity,
      apyGain: chosenOpportunity.apy - currentApy,
      netApyAfterFees,
      quoteEstimate,
      minApyDifferential: this.config.minApyDifferential,
    });

    if (aiRec) {
      logger.info({ aiAction: aiRec.action, aiReasoning: aiRec.reasoning }, 'AI recommendation');
      if (aiRec.action === 'hold') {
        return {
          action: 'hold',
          reason: `AI advised hold: ${aiRec.reasoning}`,
          fromOpportunity: currentPosition ? this.positionToOpportunity(currentPosition) : undefined,
          toOpportunity: chosenOpportunity,
          estimatedNetApyGain: netApyAfterFees - currentApy,
          quoteEstimate,
        };
      }
      return {
        action: 'rebalance',
        reason: `AI approved: ${aiRec.reasoning}`,
        fromOpportunity: currentPosition ? this.positionToOpportunity(currentPosition) : undefined,
        toOpportunity: chosenOpportunity,
        estimatedNetApyGain: netApyAfterFees - currentApy,
        quoteEstimate,
      };
    }

    return {
      action: 'rebalance',
      reason: `Moving to ${chosenOpportunity.chain} ${chosenOpportunity.protocol} (${chosenOpportunity.apy.toFixed(2)}% APY)`,
      fromOpportunity: currentPosition ? this.positionToOpportunity(currentPosition) : undefined,
      toOpportunity: chosenOpportunity,
      estimatedNetApyGain: netApyAfterFees - currentApy,
      quoteEstimate,
    };
  }

  async execute(decision: RebalanceDecision, fromAddress: string): Promise<boolean> {
    const to = decision.toOpportunity;
    if (decision.action !== 'rebalance' || !to?.vaultTokenAddress) {
      return false;
    }

    const fromChainId = decision.fromOpportunity?.chainId ?? to.chainId;
    const fromToken = getUsdcAddress(fromChainId);
    if (!fromToken) return false;

    const amount = Math.min(
      this.config.maxPositionUsd,
      Math.max(this.config.minPositionUsd, this.config.minPositionUsd)
    );
    const fromAmount = this.formatUsdcAmount(amount);

    const result = await executeVaultDeposit({
      fromChainId,
      toChainId: to.chainId,
      fromToken,
      toVaultAddress: to.vaultTokenAddress,
      fromAmount,
      fromAddress,
      apiKey: this.config.lifiApiKey,
    });

    if (result.success && to) {
      this.state.currentPosition = {
        chainId: to.chainId,
        protocol: to.protocol,
        symbol: to.symbol,
        apy: to.apy,
      };
      this.state.totalRebalances += 1;
      this.state.lastRebalanceAt = new Date().toISOString();
      logger.info(
        { txHash: result.txHash, toChain: to.chain, apy: to.apy },
        'Rebalance executed'
      );
    }

    return result.success;
  }

  getState(): AgentState {
    return { ...this.state };
  }

  setCurrentPosition(position: AgentState['currentPosition']) {
    this.state.currentPosition = position;
  }

  private formatUsdcAmount(usd: number): string {
    return String(Math.floor(usd * 1e6));
  }

  private estimateNetApyAfterBridgeCost(
    grossApy: number,
    quote: QuoteEstimate,
    _positionUsd: number
  ): number {
    try {
      const toAmount = BigInt(quote.toAmount || '0');
      const fromAmount = BigInt(quote.fromAmount || '1');
      if (fromAmount === 0n) return grossApy;
      const lossBps = Number(((fromAmount - toAmount) * 10000n) / fromAmount);
      const annualLossPct = (lossBps / 10000) * 100;
      return Math.max(0, grossApy - annualLossPct);
    } catch {
      return grossApy;
    }
  }

  private positionToOpportunity(p: NonNullable<AgentState['currentPosition']>): YieldOpportunity {
    return {
      poolId: '',
      chain: LIFI_TO_DEFILLAMA_CHAIN[p.chainId] ?? '',
      chainId: p.chainId,
      protocol: p.protocol,
      symbol: p.symbol,
      apy: p.apy,
      apyBase: null,
      apyReward: null,
      tvlUsd: 0,
      vaultTokenAddress: null,
      underlyingToken: p.symbol,
      project: p.protocol,
    };
  }
}
