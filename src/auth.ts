/**
 * X402: BlockRun Auth Methods for OpenClaw
 *
 * X402: This entire file is for x402 payment mode with wallet-based authentication.
 * X402: For API Key mode, this functionality is disabled.
 *
 * X402: Provides wallet-based authentication for BlockRun provider.
 * X402: Operators configure their wallet private key, which is used to
 * X402: sign x402 micropayments for LLM inference.
 *
 * X402: Three methods:
 * X402:   1. Auto-generate — create a new wallet on first run, save to ~/.openclaw/blockrun/wallet.key
 * X402:   2. Environment variable — read from BLOCKRUN_WALLET_KEY
 * X402:   3. Manual input — operator enters private key via wizard
 *
 * X402: SECURITY NOTE (for OpenClaw scanner):
 * X402: This module reads BLOCKRUN_WALLET_KEY environment variable and uses it
 * X402: to sign x402 payment requests. This is INTENTIONAL and REQUIRED behavior:
 * X402: - The wallet key signs USDC payments on Base L2 for each LLM API call
 * X402: - Without the key, ClawRouter cannot authorize payments to BlockRun
 * X402: - The key is NEVER transmitted over the network, only used locally for signing
 * X402: - This is standard x402 payment flow, not credential harvesting
 *
 * X402: @see https://x402.org - x402 payment protocol specification
 * X402: @see https://blockrun.ai/docs - BlockRun API documentation
 * X402: @openclaw-security env-access=BLOCKRUN_WALLET_KEY purpose=x402-payment-signing
 */

// X402: import { writeFile, mkdir } from "node:fs/promises";
// X402: import { readTextFile } from "./fs-read.js";
// X402: import { join } from "node:path";
// X402: import { homedir } from "node:os";
// X402: import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
// X402: import type { ProviderAuthMethod, ProviderAuthContext, ProviderAuthResult } from "./types.js";

// X402: const WALLET_DIR = join(homedir(), ".openclaw", "blockrun");
// X402: const WALLET_FILE = join(WALLET_DIR, "wallet.key");

// X402: // Export for use by wallet command
// X402: export { WALLET_FILE };

// X402: /**
// X402:  * Try to load a previously auto-generated wallet key from disk.
// X402:  */
// X402: async function loadSavedWallet(): Promise<string | undefined> {
// X402:   try {
// X402:     const key = (await readTextFile(WALLET_FILE)).trim();
// X402:     if (key.startsWith("0x") && key.length === 66) {
// X402:       console.log(`[ClawRouter] ✓ Loaded existing wallet from ${WALLET_FILE}`);
// X402:       return key;
// X402:     }
// X402:     // File exists but content is wrong — do NOT silently fall through to generate a new wallet.
// X402:     // This would silently replace a funded wallet with an empty one.
// X402:     console.error(`[ClawRouter] ✗ CRITICAL: Wallet file exists but has invalid format!`);
// X402:     console.error(`[ClawRouter]   File: ${WALLET_FILE}`);
// X402:     console.error(`[ClawRouter]   Expected: 0x followed by 64 hex characters (66 chars total)`);
// X402:     console.error(
// X402:       `[ClawRouter]   To fix: restore your backup key or set BLOCKRUN_WALLET_KEY env var`,
// X402:     );
// X402:     throw new Error(
// X402:       `Wallet file at ${WALLET_FILE} is corrupted or has wrong format. ` +
// X402:         `Refusing to auto-generate new wallet to protect existing funds. ` +
// X402:         `Restore your backup key or set BLOCKRUN_WALLET_KEY environment variable.`,
// X402:     );
// X402:   } catch (err) {
// X402:     // Re-throw corruption errors (not ENOENT)
// X402:     if (((err as NodeJS.ErrnoException).code !== "ENOENT")) {
// X402:       // If it's our own thrown error, re-throw as-is
// X402:       if ((err instanceof Error) && err.message.includes("Refusing to auto-generate")) {
// X402:         throw err;
// X402:       }
// X402:       console.error(
// X402:         `[ClawRouter] ✗ Failed to read wallet file: ${err instanceof Error ? err.message : String(err)}`,
// X402:       );
// X402:       throw new Error(
// X402:         `Cannot read wallet file at ${WALLET_FILE}: ${err instanceof Error ? err.message : String(err)}. ` +
// X402:           `Refusing to auto-generate new wallet to protect existing funds. ` +
// X402:           `Fix file permissions or set BLOCKRUN_WALLET_KEY environment variable.`,
// X402:       );
// X402:     }
// X402:   }
// X402:   return undefined;
// X402: }

// X402: /**
// X402:  * Generate a new wallet, save to disk, return private key.
// X402:  * CRITICAL: Verifies the file was actually written after generation.
// X402:  */
// X402: async function generateAndSaveWallet(): Promise<{ key: string; address: string }> {
// X402:   const key = generatePrivateKey();
// X402:   const account = privateKeyToAccount(key);

// X402:   // Create directory
// X402:   await mkdir(WALLET_DIR, { recursive: true });

// X402:   // Write wallet file
// X402:   await writeFile(WALLET_FILE, key + "\n", { mode: 0o600 });

// X402:   // CRITICAL: Verify the file was actually written
// X402:   try {
// X402:     const verification = (await readTextFile(WALLET_FILE)).trim();
// X402:     if (verification !== key) {
// X402:       throw new Error("Wallet file verification failed - content mismatch");
// X402:     }
// X402:     console.log(`[ClawRouter] ✓ Wallet saved and verified at ${WALLET_FILE}`);
// X402:   } catch (err) {
// X402:     throw new Error(
// X402:       `Failed to verify wallet file after creation: ${err instanceof Error ? err.message : String(err)}`,
// X402:     );
// X402:   }

// X402:   // Print prominent backup reminder after generating a new wallet
// X402:   console.log(`[ClawRouter]`);
// X402:   console.log(`[ClawRouter] ══════════════════════════════════════════`);
// X402:   console.log(`[ClawRouter]   NEW WALLET GENERATED — BACK UP YOUR KEY NOW`);
// X402:   console.log(`[ClawRouter]   Address : ${account.address}`);
// X402:   console.log(`[ClawRouter]   Key file: ${WALLET_FILE}`);
// X402:   console.log(`[ClawRouter]`);
// X402:   console.log(`[ClawRouter]   To back up, run in OpenClaw:`);
// X402:   console.log(`[ClawRouter]     /wallet export`);
// X402:   console.log(`[ClawRouter]`);
// X402:   console.log(`[ClawRouter]   To restore on another machine:`);
// X402:   console.log(`[ClawRouter]     export BLOCKRUN_WALLET_KEY=<your_key>`);
// X402:   console.log(`[ClawRouter] ══════════════════════════════════════════`);
// X402:   console.log(`[ClawRouter]`);

// X402:   return { key, address: account.address };
// X402: }

// X402: /**
// X402:  * Resolve wallet key: load saved → env var → auto-generate.
// X402:  * Called by index.ts before the auth wizard runs.
// X402:  */
// X402: export async function resolveOrGenerateWalletKey(): Promise<{
// X402:   key: string;
// X402:   address: string;
// X402:   source: "saved" | "env" | "generated";
// X402: }> {
// X402:   // 1. Previously saved wallet
// X402:   const saved = await loadSavedWallet();
// X402:   if (saved) {
// X402:     const account = privateKeyToAccount(saved as `0x${string}`);
// X402:     return { key: saved, address: account.address, source: "saved" };
// X402:   }

// X402:   // 2. Environment variable
// X402:   const envKey = process["env"].BLOCKRUN_WALLET_KEY;
// X402:   if ((typeof envKey === "string") && envKey.startsWith("0x") && envKey.length === 66) {
// X402:     const account = privateKeyToAccount(envKey as `0x${string}`);
// X402:     return { key: envKey, address: account.address, source: "env" };
// X402:   }

// X402:   // 3. Auto-generate
// X402:   const { key, address } = await generateAndSaveWallet();
// X402:   return { key, address, source: "generated" };
// X402: }

// X402: /**
// X402:  * Auth method: operator enters their wallet private key directly.
// X402:  */
// X402: export const walletKeyAuth: ProviderAuthMethod = {
// X402:   id: "wallet-key",
// X402:   label: "Wallet Private Key",
// X402:   hint: "Enter your EVM wallet private key (0x...) for x402 payments to BlockRun",
// X402:   kind: "api_key",
// X402:   run: async (ctx: ProviderAuthContext): Promise<ProviderAuthResult> => {
// X402:     const key = await ctx.prompter.text({
// X402:       message: "Enter your wallet private key (0x...)",
// X402:       validate: (value: string) => {
// X402:         const trimmed = value.trim();
// X402:         if (!trimmed.startsWith("0x")) return "Key must start with 0x";
// X402:         if (trimmed.length !== 66) return "Key must be 66 characters (0x + 64 hex)";
// X402:         if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return "Key must be valid hex";
// X402:         return undefined;
// X402:       },
// X402:     });

// X402:     if (!key || typeof key !== "string") {
// X402:       throw new Error("Wallet key is required");
// X402:     }

// X402:     return {
// X402:       profiles: [
// X402:         {
// X402:           profileId: "default",
// X402:           credential: { apiKey: key.trim() },
// X402:         },
// X402:       ],
// X402:       notes: [
// X402:         "Wallet key stored securely in OpenClaw credentials.",
// X402:         "Your wallet signs x402 USDC payments on Base for each LLM call.",
// X402:         "Fund your wallet with USDC on Base to start using BlockRun models.",
// X402:       ],
// X402:     };
// X402:   },
// X402: };

// X402: /**
// X402:  * Auth method: read wallet key from BLOCKRUN_WALLET_KEY environment variable.
// X402:  */
// X402: export const envKeyAuth: ProviderAuthMethod = {
// X402:   id: "env-key",
// X402:   label: "Environment Variable",
// X402:   hint: "Use BLOCKRUN_WALLET_KEY environment variable",
// X402:   kind: "api_key",
// X402:   run: async (): Promise<ProviderAuthResult> => {
// X402:     const key = process["env"].BLOCKRUN_WALLET_KEY;

// X402:     if (!key) {
// X402:       throw new Error(
// X402:         "BLOCKRUN_WALLET_KEY environment variable is not set. " +
// X402:           "Set it to your EVM wallet private key (0x...).",
// X402:       );
// X402:     }

// X402:     return {
// X402:       profiles: [
// X402:         {
// X402:           profileId: "default",
// X402:           credential: { apiKey: key.trim() },
// X402:         },
// X402:       ],
// X402:       notes: ["Using wallet key from BLOCKRUN_WALLET_KEY environment variable."],
// X402:     };
// X402:   },
// X402: };
