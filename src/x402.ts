/**
 * X402: x402 Payment Implementation
 *
 * X402: This entire file is for x402 payment mode.
 * X402: For API Key mode, this functionality is disabled.
 *
 * X402: Based on BlockRun's proven implementation.
 * X402: Handles 402 Payment Required responses with EIP-712 signed USDC transfers.
 *
 * X402: Optimizations (v0.3.0):
 * X402:   - Payment cache: after first 402, caches {payTo, asset, network} per endpoint.
 * X402:     On subsequent requests, pre-signs payment and sends with first request,
 * X402:     skipping the 402 round trip (~200ms savings).
 * X402:   - Falls back to normal 402 flow if pre-signed payment is rejected.
 */

// X402: import { signTypedData, privateKeyToAccount } from "viem/accounts";
// X402: import { PaymentCache } from "./payment-cache.js";

// X402: const BASE_CHAIN_ID = 8453;
// X402: const BASE_SEPOLIA_CHAIN_ID = 84532;
// X402: const DEFAULT_TOKEN_NAME = "USD Coin";
// X402: const DEFAULT_TOKEN_VERSION = "2";
// X402: const DEFAULT_NETWORK = "eip155:8453";
// X402: const DEFAULT_MAX_TIMEOUT_SECONDS = 300;

// X402: const TRANSFER_TYPES = {
// X402:   TransferWithAuthorization: [
// X402:     { name: "from", type: "address" },
// X402:     { name: "to", type: "address" },
// X402:     { name: "value", type: "uint256" },
// X402:     { name: "validAfter", type: "uint256" },
// X402:     { name: "validBefore", type: "uint256" },
// X402:     { name: "nonce", type: "bytes32" },
// X402:   ],
// X402: } as const;

// X402: function createNonce(): `0x${string}` {
// X402:   const bytes = new Uint8Array(32);
// X402:   crypto.getRandomValues(bytes);
// X402:   return `0x${Array.from(bytes)
// X402:     .map((b) => b.toString(16).padStart(2, "0"))
// X402:     .join("")}` as `0x${string}`;
// X402: }

// X402: interface PaymentOption {
// X402:   scheme: string;
// X402:   network: string;
// X402:   amount?: string;
// X402:   maxAmountRequired?: string;
// X402:   asset: string;
// X402:   payTo: string;
// X402:   maxTimeoutSeconds?: number;
// X402:   extra?: { name?: string; version?: string };
// X402: }

// X402: interface PaymentRequired {
// X402:   accepts: PaymentOption[];
// X402:   resource?: { url?: string; description?: string };
// X402: }

// X402: function decodeBase64Json<T>(value: string): T {
// X402:   const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
// X402:   const padding = (4 - (normalized.length % 4)) % 4;
// X402:   const padded = normalized + "=".repeat(padding);
// X402:   const decoded = Buffer.from(padded, "base64").toString("utf8");
// X402:   return JSON.parse(decoded) as T;
// X402: }

// X402: function encodeBase64Json(value: unknown): string {
// X402:   return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
// X402: }

// X402: function parsePaymentRequired(headerValue: string): PaymentRequired {
// X402:   return decodeBase64Json<PaymentRequired>(headerValue);
// X402: }

// X402: function normalizeNetwork(network: string | undefined): string {
// X402:   if (!network || network.trim().length === 0) {
// X402:     return DEFAULT_NETWORK;
// X402:   }
// X402:   return network.trim().toLowerCase();
// X402: }

// X402: function resolveChainId(network: string): number {
// X402:   const eip155Match = network.match(/^eip155:(\d+)$/i);
// X402:   if (eip155Match) {
// X402:     const parsed = Number.parseInt(eip155Match[1], 10);
// X402:     if (Number.isFinite(parsed) && parsed > 0) {
// X402:       return parsed;
// X402:     }
// X402:   }
// X402:   if (network === "base") return BASE_CHAIN_ID;
// X402:   if (network === "base-sepolia") return BASE_SEPOLIA_CHAIN_ID;
// X402:   return BASE_CHAIN_ID;
// X402: }

// X402: function parseHexAddress(value: string | undefined): `0x${string}` | undefined {
// X402:   if (!value) return undefined;

// X402:   const direct = value.match(/^0x[a-fA-F0-9]{40}$/);
// X402:   if (direct) {
// X402:     return direct[0] as `0x${string}`;
// X402:   }

// X402:   // Some providers send CAIP-style assets (e.g. ".../erc20:0x...").
// X402:   const caipSuffix = value.match(/0x[a-fA-F0-9]{40}$/);
// X402:   if (caipSuffix) {
// X402:     return caipSuffix[0] as `0x${string}`;
// X402:   }

// X402:   return undefined;
// X402: }

// X402: function requireHexAddress(value: string | undefined, field: string): `0x${string}` {
// X402:   const parsed = parseHexAddress(value);
// X402:   if (!parsed) {
// X402:     throw new Error(`Invalid ${field} in payment requirements: ${String(value)}`);
// X402:   }
// X402:   return parsed;
// X402: }

// X402: function setPaymentHeaders(headers: Headers, payload: string): void {
// X402:   // Support both modern and legacy header names for compatibility.
// X402:   headers.set("payment-signature", payload);
// X402:   headers.set("x-payment", payload);
// X402: }

// X402: async function createPaymentPayload(
// X402:   privateKey: `0x${string}`,
// X402:   fromAddress: string,
// X402:   option: PaymentOption,
// X402:   amount: string,
// X402:   requestUrl: string,
// X402:   resource: PaymentRequired["resource"],
// X402: ): Promise<string> {
// X402:   const network = normalizeNetwork(option.network);
// X402:   const chainId = resolveChainId(network);
// X402:   const recipient = requireHexAddress(option.payTo, "payTo");
// X402:   const verifyingContract = requireHexAddress(option.asset, "asset");

// X402:   const maxTimeoutSeconds =
// X402:     typeof option.maxTimeoutSeconds === "number" && option.maxTimeoutSeconds > 0
// X402:       ? Math.floor(option.maxTimeoutSeconds)
// X402:       : DEFAULT_MAX_TIMEOUT_SECONDS;

// X402:   const now = Math.floor(Date.now() / 1000);
// X402:   const validAfter = now - 600;
// X402:   const validBefore = now + maxTimeoutSeconds;
// X402:   const nonce = createNonce();

// X402:   const signature = await signTypedData({
// X402:     privateKey,
// X402:     domain: {
// X402:       name: option.extra?.name || DEFAULT_TOKEN_NAME,
// X402:       version: option.extra?.version || DEFAULT_TOKEN_VERSION,
// X402:       chainId,
// X402:       verifyingContract,
// X402:     },
// X402:     types: TRANSFER_TYPES,
// X402:     primaryType: "TransferWithAuthorization",
// X402:     message: {
// X402:       from: fromAddress as `0x${string}`,
// X402:       to: recipient,
// X402:       value: BigInt(amount),
// X402:       validAfter: BigInt(validAfter),
// X402:       validBefore: BigInt(validBefore),
// X402:       nonce,
// X402:     },
// X402:   });

// X402:   const paymentData = {
// X402:     x402Version: 2,
// X402:     resource: {
// X402:       url: resource?.url || requestUrl,
// X402:       description: resource?.description || "BlockRun AI API call",
// X402:       mimeType: "application/json",
// X402:     },
// X402:     accepted: {
// X402:       scheme: option.scheme,
// X402:       network,
// X402:       amount,
// X402:       asset: option.asset,
// X402:       payTo: option.payTo,
// X402:       maxTimeoutSeconds: option.maxTimeoutSeconds,
// X402:       extra: option.extra,
// X402:     },
// X402:     payload: {
// X402:       signature,
// X402:       authorization: {
// X402:         from: fromAddress,
// X402:         to: recipient,
// X402:         value: amount,
// X402:         validAfter: validAfter.toString(),
// X402:         validBefore: validBefore.toString(),
// X402:         nonce,
// X402:       },
// X402:     },
// X402:     extensions: {},
// X402:   };

// X402:   return encodeBase64Json(paymentData);
// X402: }

// X402: /** Pre-auth parameters for skipping 402 round trip. */
// X402: export type PreAuthParams = {
// X402:   estimatedAmount: string; // USDC amount in smallest unit (6 decimals)
// X402: };

// X402: /** Result from createPaymentFetch — includes fetch wrapper and payment cache. */
// X402: export type PaymentFetchResult = {
// X402:   fetch: (
// X402:     input: RequestInfo | URL,
// X402:     init?: RequestInit,
// X402:     preAuth?: PreAuthParams,
// X402:   ) => Promise<Response>;
// X402:   cache: PaymentCache;
// X402: };

// X402: /**
// X402:  * Create a fetch wrapper that handles x402 payment automatically.
// X402:  *
// X402:  * Supports pre-auth: if cached payment params + estimated amount are available,
// X402:  * pre-signs and attaches payment to first request, skipping 402 round trip.
// X402:  * Falls back to normal 402 flow if pre-signed payment is rejected.
// X402:  */
// X402: export function createPaymentFetch(privateKey: `0x${string}`): PaymentFetchResult {
// X402:   const account = privateKeyToAccount(privateKey);
// X402:   const walletAddress = account.address;
// X402:   const paymentCache = new PaymentCache();

// X402:   const payFetch = async (
// X402:     input: RequestInfo | URL,
// X402:     init?: RequestInit,
// X402:     preAuth?: PreAuthParams,
// X402:   ): Promise<Response> => {
// X402:     const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
// X402:     const endpointPath = new URL(url).pathname;

// X402:     // --- Pre-auth path: skip 402 round trip ---
// X402:     const cached = paymentCache.get(endpointPath);
// X402:     if (cached && preAuth?.estimatedAmount) {
// X402:       const paymentPayload = await createPaymentPayload(
// X402:         privateKey,
// X402:         walletAddress,
// X402:         {
// X402:           scheme: cached.scheme,
// X402:           network: cached.network,
// X402:           asset: cached.asset,
// X402:           payTo: cached.payTo,
// X402:           maxTimeoutSeconds: cached.maxTimeoutSeconds,
// X402:           extra: cached.extra,
// X402:         },
// X402:         preAuth.estimatedAmount,
// X402:         url,
// X402:         {
// X402:           url: cached.resourceUrl,
// X402:           description: cached.resourceDescription,
// X402:         },
// X402:       );

// X402:       const preAuthHeaders = new Headers(init?.headers);
// X402:       setPaymentHeaders(preAuthHeaders, paymentPayload);

// X402:       const response = await fetch(input, { ...init, headers: preAuthHeaders });

// X402:       // Pre-auth accepted — skip 402 entirely
// X402:       if (response.status !== 402) {
// X402:         return response;
// X402:       }

// X402:       // Pre-auth rejected (wrong amount, payTo changed, etc.)
// X402:       // Try to use this 402's payment header for a proper retry
// X402:       const paymentHeader = response.headers.get("x-payment-required");
// X402:       if (paymentHeader) {
// X402:         return handle402(input, init, url, endpointPath, paymentHeader);
// X402:       }

// X402:       // No payment header — invalidate cache and retry clean (no payment header)
// X402:       // to get a proper 402 with payment requirements
// X402:       paymentCache.invalidate(endpointPath);
// X402:       const cleanResponse = await fetch(input, init);
// X402:       if (cleanResponse.status !== 402) {
// X402:         return cleanResponse;
// X402:       }
// X402:       const cleanHeader = cleanResponse.headers.get("x-payment-required");
// X402:       if (!cleanHeader) {
// X402:         throw new Error("402 response missing x-payment-required header");
// X402:       }
// X402:       return handle402(input, init, url, endpointPath, cleanHeader);
// X402:     }

// X402:     // --- Normal path: first request may get 402 ---
// X402:     const response = await fetch(input, init);

// X402:     if (response.status !== 402) {
// X402:       return response;
// X402:     }

// X402:     const paymentHeader = response.headers.get("x-payment-required");
// X402:     if (!paymentHeader) {
// X402:       throw new Error("402 response missing x-payment-required header");
// X402:     }

// X402:     return handle402(input, init, url, endpointPath, paymentHeader);
// X402:   };

// X402:   /** Handle a 402 response: parse, cache params, sign, retry. */
// X402:   async function handle402(
// X402:     input: RequestInfo | URL,
// X402:     init: RequestInit | undefined,
// X402:     url: string,
// X402:     endpointPath: string,
// X402:     paymentHeader: string,
// X402:   ): Promise<Response> {
// X402:     const paymentRequired = parsePaymentRequired(paymentHeader);
// X402:     const option = paymentRequired.accepts?.[0];
// X402:     if (!option) {
// X402:       throw new Error("No payment options in 402 response");
// X402:     }

// X402:     const amount = option.amount || option.maxAmountRequired;
// X402:     if (!amount) {
// X402:       throw new Error("No amount in payment requirements");
// X402:     }

// X402:     // Cache payment params for future pre-auth
// X402:     paymentCache.set(endpointPath, {
// X402:       payTo: option.payTo,
// X402:       asset: option.asset,
// X402:       scheme: option.scheme,
// X402:       network: option.network,
// X402:       extra: option.extra,
// X402:       maxTimeoutSeconds: option.maxTimeoutSeconds,
// X402:       resourceUrl: paymentRequired.resource?.url,
// X402:       resourceDescription: paymentRequired.resource?.description,
// X402:     });

// X402:     // Create signed payment
// X402:     const paymentPayload = await createPaymentPayload(
// X402:       privateKey,
// X402:       walletAddress,
// X402:       option,
// X402:       amount,
// X402:       url,
// X402:       paymentRequired.resource,
// X402:     );

// X402:     // Retry with payment
// X402:     const retryHeaders = new Headers(init?.headers);
// X402:     setPaymentHeaders(retryHeaders, paymentPayload);

// X402:     return fetch(input, {
// X402:       ...init,
// X402:       headers: retryHeaders,
// X402:     });
// X402:   }

// X402:   return { fetch: payFetch, cache: paymentCache };
// X402: }
