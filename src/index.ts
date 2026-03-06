#!/usr/bin/env node
/**
 * Cross-Chain Yield Hunter - CLI entry point
 * LI.FI Vibeathon submission
 */

import { loadConfig } from './config.js';
import { initLifi } from './lifiExecutor.js';
import { initAi } from './ai.js';
import { YieldHunterAgent } from './agent.js';
import { logger } from './logger.js';
import { privateKeyToAccount } from 'viem/accounts';
import chalk from 'chalk';

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] ?? 'run';
  const isDryRun = args.includes('--dry-run');

  console.log(chalk.bold.cyan('\n🦎 Cross-Chain Yield Hunter Agent\n'));

  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig(cmd !== 'scan');
  } catch (err) {
    console.error(chalk.red('Config error:'), (err as Error).message);
    console.log(chalk.dim('\nCopy .env.example to .env and fill in PRIVATE_KEY (required for run)'));
    process.exit(1);
  }

  const effectiveDryRun = isDryRun || config.dryRun;
  if (effectiveDryRun) {
    console.log(chalk.yellow('⚠️  DRY RUN – no transactions will be executed\n'));
  }

  if (cmd !== 'scan') {
    initLifi(config.privateKey, config.lifiApiKey);
  }
  initAi(config.openaiApiKey, config.groqApiKey);

  const fromAddress = config.privateKey
    ? privateKeyToAccount(config.privateKey as `0x${string}`).address
    : '';

  const agent = new YieldHunterAgent({
    ...config,
    dryRun: effectiveDryRun,
  });

  if (cmd === 'scan') {
    await runScan(agent);
    return;
  }

  if (cmd === 'run') {
    await runAgent(agent, fromAddress, config.scanIntervalMinutes, effectiveDryRun);
    return;
  }

  console.log(chalk.red('Unknown command:'), cmd);
  console.log('Usage:');
  console.log('  npm run agent        Run the agent loop');
  console.log('  npm run agent:dry    Run in dry-run (scan + decide only)');
  console.log('  npm run scan         One-time yield scan');
  process.exit(1);
}

async function runScan(agent: YieldHunterAgent) {
  console.log(chalk.cyan('Scanning yields...\n'));

  const opportunities = await agent.scan();

  if (opportunities.length === 0) {
    console.log(chalk.yellow('No opportunities found.'));
    console.log('Try adjusting MIN_POSITION_USD or check DefiLlama API.');
    return;
  }

  console.log(chalk.green(`Found ${opportunities.length} opportunities:\n`));
  console.log(
    'Chain      Protocol   Symbol    APY      TVL (USD)'
  );
  console.log('-'.repeat(50));

  for (const o of opportunities.slice(0, 15)) {
    console.log(
      `${o.chain.padEnd(10)} ${o.protocol.padEnd(10)} ${o.symbol.padEnd(8)} ` +
        `${o.apy.toFixed(2).padStart(6)}%  ${(o.tvlUsd / 1e6).toFixed(2)}M`
    );
  }
}

async function runAgent(
  agent: YieldHunterAgent,
  fromAddress: string,
  intervalMinutes: number,
  dryRun: boolean
) {
  const runOnce = async () => {
    logger.info('Starting scan cycle');

    const opportunities = await agent.scan();
    const state = agent.getState();

    if (opportunities.length === 0) {
      logger.info('No opportunities; holding');
      return;
    }

    const decision = await agent.decide(opportunities, state.currentPosition, fromAddress);

    logger.info(
      {
        action: decision.action,
        reason: decision.reason,
        toChain: decision.toOpportunity?.chain,
        toProtocol: decision.toOpportunity?.protocol,
        apyGain: decision.estimatedNetApyGain,
      },
      'Decision'
    );

    if (decision.action === 'rebalance' && decision.toOpportunity) {
      if (!dryRun) {
        const ok = await agent.execute(decision, fromAddress);
        if (ok) {
          console.log(chalk.green('\n✅ Rebalance executed successfully\n'));
        } else {
          console.log(chalk.red('\n❌ Rebalance failed\n'));
        }
      } else {
        console.log(
          chalk.cyan(
            '\n📋 Would rebalance to:',
            decision.toOpportunity.chain,
            decision.toOpportunity.protocol,
            `(${decision.toOpportunity.apy.toFixed(2)}% APY)\n`
          )
        );
      }
    }
  };

  await runOnce();

  if (intervalMinutes > 0) {
    console.log(chalk.dim(`\nNext scan in ${intervalMinutes} minutes...\n`));
    setInterval(runOnce, intervalMinutes * 60 * 1000);
  }
}

main().catch((err) => {
  logger.error(err, 'Fatal error');
  process.exit(1);
});
