/**
 * Agent configuration from environment
 */

import 'dotenv/config';
import type { AgentConfig } from './types.js';
import { SUPPORTED_CHAINS } from './chainMap.js';

function requireEnv(name: string, forCommand?: string): string {
  const val = process.env[name];
  if (!val?.trim()) {
    throw new Error(`Missing required env: ${name}. See .env.example${forCommand ? ` (needed for: ${forCommand})` : ''}`);
  }
  return val.trim();
}

function optionalEnv(name: string, defaultVal: string): string {
  return process.env[name]?.trim() ?? defaultVal;
}

function parseNumber(val: string, defaultVal: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : defaultVal;
}

export function loadConfig(requirePrivateKey = true): AgentConfig {
  return {
    privateKey: requirePrivateKey ? requireEnv('PRIVATE_KEY', 'run') : (process.env.PRIVATE_KEY?.trim() ?? ''),
    lifiApiKey: process.env.LIFI_API_KEY?.trim() || undefined,
    minApyDifferential: parseNumber(
      optionalEnv('MIN_APY_DIFFERENTIAL', '1.5'),
      1.5
    ),
    minPositionUsd: parseNumber(optionalEnv('MIN_POSITION_USD', '1000'), 1000),
    maxPositionUsd: parseNumber(optionalEnv('MAX_POSITION_USD', '10000'), 10000),
    scanIntervalMinutes: parseNumber(
      optionalEnv('SCAN_INTERVAL_MINUTES', '30'),
      30
    ),
    dryRun: optionalEnv('DRY_RUN', 'true').toLowerCase() === 'true',
    allowedChains: [...SUPPORTED_CHAINS],
    allowedProtocols: ['morpho', 'aave-v3', 'euler', 'pendle', 'seamless'],
    initialChainId: parseNumber(optionalEnv('INITIAL_CHAIN_ID', '42161'), 42161),
  };
}
