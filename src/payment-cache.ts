/**
 * X402: Payment Parameter Cache
 *
 * X402: This entire file is for x402 payment mode.
 * X402: For API Key mode, this functionality is disabled.
 *
 * X402: Caches x402 payment parameters (payTo, asset, network, etc.) after the first
 * X402: request to each endpoint. On subsequent requests, pre-signs the payment and
 * X402: attaches it to the first request, skipping the 402 round trip (~200ms savings).
 */

// X402: export type CachedPaymentParams = {
// X402:   payTo: string;
// X402:   asset: string;
// X402:   scheme: string;
// X402:   network: string;
// X402:   extra?: { name?: string; version?: string };
// X402:   maxTimeoutSeconds?: number;
// X402:   resourceUrl?: string;
// X402:   resourceDescription?: string;
// X402:   cachedAt: number;
// X402: };

// X402: const DEFAULT_TTL_MS = 3_600_000; // 1 hour

// X402: export class PaymentCache {
// X402:   private cache = new Map<string, CachedPaymentParams>();
// X402:   private ttlMs: number;

// X402:   constructor(ttlMs = DEFAULT_TTL_MS) {
// X402:     this.ttlMs = ttlMs;
// X402:   }

// X402:   /** Get cached payment params for an endpoint path. */
// X402:   get(endpointPath: string): CachedPaymentParams | undefined {
// X402:     const entry = this.cache.get(endpointPath);
// X402:     if (!entry) return undefined;
// X402:     if (Date.now() - entry.cachedAt > this.ttlMs) {
// X402:       this.cache.delete(endpointPath);
// X402:       return undefined;
// X402:     }
// X402:     return entry;
// X402:   }

// X402:   /** Cache payment params from a 402 response. */
// X402:   set(endpointPath: string, params: Omit<CachedPaymentParams, "cachedAt">): void {
// X402:     this.cache.set(endpointPath, { ...params, cachedAt: Date.now() });
// X402:   }

// X402:   /** Invalidate cache for an endpoint (e.g., if payTo changed). */
// X402:   invalidate(endpointPath: string): void {
// X402:     this.cache.delete(endpointPath);
// X402:   }
// X402: }
