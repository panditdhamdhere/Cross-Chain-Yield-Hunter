/**
 * LI.FI Composer vault token address registry
 * Maps (chainId, protocol, symbol) -> vault token address for deposit/withdraw
 *
 * @see https://docs.li.fi/composer/reference/supported-protocols
 * @see https://docs.li.fi/composer/recipes/vault-deposits
 */

export interface VaultEntry {
  chainId: number;
  protocol: string;
  symbol: string;
  vaultAddress: string;
}

/**
 * Known vault token addresses for LI.FI Composer
 * Add more as needed - format: (chainId, protocol, symbol) -> vault address
 */
export const VAULT_REGISTRY: VaultEntry[] = [
  // Morpho - Base
  {
    chainId: 8453,
    protocol: 'morpho',
    symbol: 'USDC',
    vaultAddress: '0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A',
  },
  // Morpho - Arbitrum
  {
    chainId: 42161,
    protocol: 'morpho',
    symbol: 'USDC',
    vaultAddress: '0x5d9208e401ad814ed52ba3040d8fd5217035d6cb',
  },
  // Aave V3 - Base (aUSDC)
  {
    chainId: 8453,
    protocol: 'aave-v3',
    symbol: 'USDC',
    vaultAddress: '0x4e65fe4dba92790696d040ac24aa414708f5c0ab',
  },
  // Aave V3 - Arbitrum (aArbUSDC)
  {
    chainId: 42161,
    protocol: 'aave-v3',
    symbol: 'USDC',
    vaultAddress: '0x625e7708f30ca75bfd92586e17077590c60eb4cd',
  },
  // Aave V3 - Ethereum
  {
    chainId: 1,
    protocol: 'aave-v3',
    symbol: 'USDC',
    vaultAddress: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5',
  },
  // Aave V3 - Optimism
  {
    chainId: 10,
    protocol: 'aave-v3',
    symbol: 'USDC',
    vaultAddress: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
  },
  // Aave V3 - Polygon
  {
    chainId: 137,
    protocol: 'aave-v3',
    symbol: 'USDC',
    vaultAddress: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
  },
];

/**
 * Get vault address for a given chain, protocol, and symbol
 */
export function getVaultAddress(
  chainId: number,
  protocol: string,
  symbol: string
): string | null {
  const normalizedProtocol = protocol.toLowerCase().replace(/\s+/g, '-');
  const normalizedSymbol = symbol.toUpperCase();

  const entry = VAULT_REGISTRY.find(
    (v) =>
      v.chainId === chainId &&
      v.protocol === normalizedProtocol &&
      (v.symbol === normalizedSymbol || v.symbol === symbol)
  );

  return entry?.vaultAddress ?? null;
}

/**
 * Get all supported (chain, protocol) pairs
 */
export function getSupportedVaults(): VaultEntry[] {
  return [...VAULT_REGISTRY];
}
