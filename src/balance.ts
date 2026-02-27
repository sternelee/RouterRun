/**
 * X402: Balance Monitor for ClawRouter
 *
 * X402: This entire file is for x402 payment mode with USDC balance monitoring.
 * X402: For API Key mode, this functionality is disabled.
 *
 * X402: Monitors USDC balance on Base network with intelligent caching.
 * X402: Provides pre-request balance checks to prevent failed payments.
 *
 * X402: Caching Strategy:
 * X402:   - TTL: 30 seconds (balance is cached to avoid excessive RPC calls)
 * X402:   - Optimistic deduction: after successful payment, subtract estimated cost from cache
 * X402:   - Invalidation: on payment failure, immediately refresh from RPC
 */

// X402: import { createPublicClient, http, erc20Abi } from "viem";
// X402: import { base } from "viem/chains";
// X402: import { RpcError } from "./errors.js";

// X402: /** USDC contract address on Base mainnet */
// X402: const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

// X402: /** Cache TTL in milliseconds (30 seconds) */
// X402: const CACHE_TTL_MS = 30_000;

// X402: /** Balance thresholds in USDC smallest unit (6 decimals) */
// X402: export const BALANCE_THRESHOLDS = {
// X402:   /** Low balance warning threshold: $1.00 */
// X402:   LOW_BALANCE_MICROS: 1_000_000n,
// X402:   /** Effectively zero threshold: $0.0001 (covers dust/rounding) */
// X402:   ZERO_THRESHOLD: 100n,
// X402: } as const;

// X402: /** Balance information returned by checkBalance() */
// X402: export type BalanceInfo = {
// X402:   /** Raw balance in USDC smallest unit (6 decimals) */
// X402:   balance: bigint;
// X402:   /** Formatted balance as "$X.XX" */
// X402:   balanceUSD: string;
// X402:   /** True if balance < $1.00 */
// X402:   isLow: boolean;
// X402:   /** True if balance < $0.0001 (effectively zero) */
// X402:   isEmpty: boolean;
// X402:   /** Wallet address for funding instructions */
// X402:   walletAddress: string;
// X402: };

// X402: /** Result from checkSufficient() */
// X402: export type SufficiencyResult = {
// X402:   /** True if balance >= estimated cost */
// X402:   sufficient: boolean;
// X402:   /** Current balance info */
// X402:   info: BalanceInfo;
// X402:   /** If insufficient, shortfall as "$X.XX" */
// X402:   shortfall?: string;
// X402: };

// X402: /**
// X402:  * Monitors USDC balance on Base network.
// X402:  *
// X402:  * Usage:
// X402:  *   const monitor = new BalanceMonitor("0x...");
// X402:  *   const info = await monitor.checkBalance();
// X402:  *   if (info.isLow) console.warn("Low balance!");
// X402:  */
// X402: export class BalanceMonitor {
// X402:   private readonly client;
// X402:   private readonly walletAddress: `0x${string}`;

// X402:   /** Cached balance (null = not yet fetched) */
// X402:   private cachedBalance: bigint | null = null;
// X402:   /** Timestamp when cache was last updated */
// X402:   private cachedAt = 0;

// X402:   constructor(walletAddress: string) {
// X402:     this.walletAddress = walletAddress as `0x${string}`;
// X402:     this.client = createPublicClient({
// X402:       chain: base,
// X402:       transport: http(undefined, {
// X402:         timeout: 10_000, // 10 second timeout to prevent hanging on slow RPC
// X402:       }),
// X402:     });
// X402:   }

// X402:   /**
// X402:   * Check current USDC balance.
// X402:   * Uses cache if valid, otherwise fetches from RPC.
// X402:   */
// X402:   async checkBalance(): Promise<BalanceInfo> {
// X402:     const now = Date.now();

// X402:     // Use cache if valid
// X402:     if (this.cachedBalance !== null && now - this.cachedAt < CACHE_TTL_MS) {
// X402:       return this.buildInfo(this.cachedBalance);
// X402:     }

// X402:     // Fetch from RPC
// X402:     const balance = await this.fetchBalance();
// X402:     this.cachedBalance = balance;
// X402:     this.cachedAt = now;
// X402:     return this.buildInfo(balance);
// X402:   }

// X402:   /**
// X402:   * Check if balance is sufficient for an estimated cost.
// X402:   *
// X402:  * @param estimatedCostMicros - Estimated cost in USDC smallest unit (6 decimals)
// X402:   */
// X402:   async checkSufficient(estimatedCostMicros: bigint): Promise<SufficiencyResult> {
// X402:     const info = await this.checkBalance();

// X402:     if (info.balance >= estimatedCostMicros) {
// X402:       return { sufficient: true, info };
// X402:     }

// X402:     const shortfall = estimatedCostMicros - info.balance;
// X402:     return {
// X402:       sufficient: false,
// X402:       info,
// X402:       shortfall: this.formatUSDC(shortfall),
// X402:     };
// X402:   }

// X402:   /**
// X402:   * Optimistically deduct estimated cost from cached balance.
// X402:   * Call this after a successful payment to keep cache accurate.
// X402:   *
// X402:   * @param amountMicros - Amount to deduct in USDC smallest unit
// X402:   */
// X402:   deductEstimated(amountMicros: bigint): void {
// X402:     if (this.cachedBalance !== null && this.cachedBalance >= amountMicros) {
// X402:       this.cachedBalance -= amountMicros;
// X402:     }
// X402:   }

// X402:   /**
// X402:   * Invalidate cache, forcing next checkBalance() to fetch from RPC.
// X402:   * Call this after a payment failure to get accurate balance.
// X402:   */
// X402:   invalidate(): void {
// X402:     this.cachedBalance = null;
// X402:     this.cachedAt = 0;
// X402:   }

// X402:   /**
// X402:   * Force refresh balance from RPC (ignores cache).
// X402:   */
// X402:   async refresh(): Promise<BalanceInfo> {
// X402:     this.invalidate();
// X402:     return this.checkBalance();
// X402:   }

// X402:   /**
// X402:   * Format USDC amount (in micros) as "$X.XX".
// X402:   */
// X402:   formatUSDC(amountMicros: bigint): string {
// X402:     // USDC has 6 decimals
// X402:     const dollars = Number(amountMicros) / 1_000_000;
// X402:     return `$${dollars.toFixed(2)}`;
// X402:   }

// X402:   /**
// X402:   * Get the wallet address being monitored.
// X402:   */
// X402:   getWalletAddress(): string {
// X402:     return this.walletAddress;
// X402:   }

// X402:   /** Fetch balance from RPC */
// X402:   private async fetchBalance(): Promise<bigint> {
// X402:     try {
// X402:       const balance = await this.client.readContract({
// X402:         address: USDC_BASE,
// X402:         abi: erc20Abi,
// X402:         functionName: "balanceOf",
// X402:         args: [this.walletAddress],
// X402:       });
// X402:       return balance;
// X402:     } catch (error) {
// X402:       // Throw typed error instead of silently returning 0
// X402:       // This allows callers to distinguish "node down" from "wallet empty"
// X402:       throw new RpcError(error instanceof Error ? error.message : "Unknown error", error);
// X402:     }
// X402:   }

// X402:   /** Build BalanceInfo from raw balance */
// X402:   private buildInfo(balance: bigint): BalanceInfo {
// X402:     return {
// X402:       balance,
// X402:       balanceUSD: this.formatUSDC(balance),
// X402:       isLow: balance < BALANCE_THRESHOLDS.LOW_BALANCE_MICROS,
// X402:       isEmpty: balance < BALANCE_THRESHOLDS.ZERO_THRESHOLD,
// X402:       walletAddress: this.walletAddress,
// X402:     };
// X402:   }
// X402: }
