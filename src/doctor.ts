/**
 * BlockRun Doctor - AI-Powered Diagnostics
 *
 * Collects system diagnostics and sends to Claude Opus 4.6 for analysis.
 * Works independently of OpenClaw - uses API keys instead of x402 payments.
 */

import { platform, arch, freemem, totalmem } from "node:os";

// X402: import { resolveOrGenerateWalletKey, WALLET_FILE } from "./auth.js";
// X402: import { BalanceMonitor } from "./balance.js";
import { getStats } from "./stats.js";
// X402: import { createPaymentFetch } from "./x402.js";
import { getProxyPort } from "./proxy.js";
import { VERSION } from "./version.js";

// API Key imports
import { loadApiKeys, getConfiguredProviders, isModelAccessible, resolveProviderAccess } from "./api-keys.js";

// Types
interface SystemInfo {
  os: string;
  arch: string;
  nodeVersion: string;
  memoryFree: string;
  memoryTotal: string;
}

// X402: interface WalletInfo {
// X402:   exists: boolean;
// X402:   valid: boolean;
// X402:   address: string | null;
// X402:   balance: string | null;
// X402:   isLow: boolean;
// X402:   isEmpty: boolean;
// X402:   source: "saved" | "env" | "generated" | null;
// X402: }

interface ProviderInfo {
  providers: string[];
  hasOpenRouter: boolean;
  configuredModels: string[];
  isReady: boolean;
}

interface NetworkInfo {
  blockrunApi: { reachable: boolean; latencyMs: number | null };
  localProxy: { running: boolean; port: number };
}

interface LogInfo {
  requestsLast24h: number;
  costLast24h: string;
  errorsFound: number;
}

interface DiagnosticResult {
  version: string;
  timestamp: string;
  system: SystemInfo;
  // X402: wallet: WalletInfo;
  providers: ProviderInfo;
  network: NetworkInfo;
  logs: LogInfo;
  issues: string[];
}

// Helpers
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)}GB`;
}

function green(text: string): string {
  return `\x1b[32m✓\x1b[0m ${text}`;
}

function red(text: string): string {
  return `\x1b[31m✗\x1b[0m ${text}`;
}

function yellow(text: string): string {
  return `\x1b[33m⚠\x1b[0m ${text}`;
}

// Collect system info
function collectSystemInfo(): SystemInfo {
  return {
    os: `${platform()} ${arch()}`,
    arch: arch(),
    nodeVersion: process.version,
    memoryFree: formatBytes(freemem()),
    memoryTotal: formatBytes(totalmem()),
  };
}

// X402: // Collect wallet info
// X402: async function collectWalletInfo(): Promise<WalletInfo> {
// X402:   try {
// X402:     const { key, address, source } = await resolveOrGenerateWalletKey();
// X402:
// X402:     if (!key || !address) {
// X402:       return {
// X402:         exists: false,
// X402:         valid: false,
// X402:         address: null,
// X402:         balance: null,
// X402:         isLow: false,
// X402:         isEmpty: true,
// X402:         source: null,
// X402:       };
// X402:     }
// X402:
// X402:     // Check balance
// X402:     const monitor = new BalanceMonitor(address);
// X402:     try {
// X402:       const balanceInfo = await monitor.checkBalance();
// X402:       return {
// X402:         exists: true,
// X402:         valid: true,
// X402:         address,
// X402:         balance: balanceInfo.balanceUSD,
// X402:         isLow: balanceInfo.isLow,
// X402:         isEmpty: balanceInfo.isEmpty,
// X402:         source,
// X402:       };
// X402:     } catch {
// X402:       return {
// X402:         exists: true,
// X402:         valid: true,
// X402:         address,
// X402:         balance: null,
// X402:         isLow: false,
// X402:         isEmpty: false,
// X402:         source,
// X402:       };
// X402:     }
// X402:   } catch {
// X402:     return {
// X402:       exists: false,
// X402:       valid: false,
// X402:       address: null,
// X402:       balance: null,
// X402:       isLow: false,
// X402:       isEmpty: true,
// X402:       source: null,
// X402:     };
// X402:   }
// X402: }

// Collect provider info (API keys)
function collectProviderInfo(): ProviderInfo {
  const config = loadApiKeys();
  const providers = getConfiguredProviders(config);
  const hasOpenRouter = providers.includes("openrouter");

  // Check accessibility for common models
  const modelsToCheck = [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-opus-4.6",
    "xai/grok-beta",
    "deepseek/deepseek-chat",
    "google/gemini-2.0-flash-exp",
  ];

  const configuredModels = modelsToCheck.filter((model) => isModelAccessible(config, model));

  return {
    providers,
    hasOpenRouter,
    configuredModels,
    isReady: providers.length > 0,
  };
}

// Collect network info
async function collectNetworkInfo(): Promise<NetworkInfo> {
  const port = getProxyPort();

  // Check BlockRun API
  let blockrunReachable = false;
  let blockrunLatency: number | null = null;
  try {
    const start = Date.now();
    const response = await fetch("https://blockrun.ai/api/v1/models", {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
    blockrunLatency = Date.now() - start;
    blockrunReachable = response.ok || response.status === 402;
  } catch {
    blockrunReachable = false;
  }

  // Check local proxy
  let proxyRunning = false;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    proxyRunning = response.ok;
  } catch {
    proxyRunning = false;
  }

  return {
    blockrunApi: { reachable: blockrunReachable, latencyMs: blockrunLatency },
    localProxy: { running: proxyRunning, port },
  };
}

// Collect log info
async function collectLogInfo(): Promise<LogInfo> {
  try {
    const stats = await getStats(1); // Last 1 day
    return {
      requestsLast24h: stats.totalRequests,
      costLast24h: `$${stats.totalCost.toFixed(4)}`,
      errorsFound: 0, // TODO: parse error logs
    };
  } catch {
    return {
      requestsLast24h: 0,
      costLast24h: "$0.00",
      errorsFound: 0,
    };
  }
}

// Identify issues
function identifyIssues(result: DiagnosticResult): string[] {
  const issues: string[] = [];

  // X402: if (!result.wallet.exists) {
  // X402:   issues.push("No wallet found");
  // X402: }
  // X402: if (result.wallet.isEmpty) {
  // X402:   issues.push("Wallet is empty - need to fund with USDC on Base");
  // X402: } else if (result.wallet.isLow) {
  // X402:   issues.push("Wallet balance is low (< $1.00)");
  // X402: }

  if (!result.providers.isReady) {
    issues.push("No API keys configured - set provider keys via env vars or config file");
    issues.push("  Available providers: openai, anthropic, google, xai, deepseek, moonshot, nvidia, openrouter");
  }

  if (!result.network.blockrunApi.reachable) {
    issues.push("Cannot reach BlockRun API - check internet connection");
  }
  if (!result.network.localProxy.running) {
    issues.push(`Local proxy not running on port ${result.network.localProxy.port}`);
  }

  return issues;
}

// Print diagnostics to terminal
function printDiagnostics(result: DiagnosticResult): void {
  console.log("\n🔍 Collecting diagnostics...\n");

  // System
  console.log("System");
  console.log(`  ${green(`OS: ${result.system.os}`)}`);
  console.log(`  ${green(`Node: ${result.system.nodeVersion}`)}`);
  console.log(
    `  ${green(`Memory: ${result.system.memoryFree} free / ${result.system.memoryTotal}`)}`,
  );

  // X402: // Wallet
  // X402: console.log("\nWallet");
  // X402: if (result.wallet.exists && result.wallet.valid) {
  // X402:   console.log(`  ${green(`Key: ${WALLET_FILE} (${result.wallet.source})`)}`);
  // X402:   console.log(`  ${green(`Address: ${result.wallet.address}`)}`);
  // X402:   if (result.wallet.isEmpty) {
  // X402:     console.log(`  ${red(`Balance: $0.00 - NEED TO FUND!`)}`);
  // X402:   } else if (result.wallet.isLow) {
  // X402:     console.log(`  ${yellow(`Balance: ${result.wallet.balance} (low)`)}`);
  // X402:   } else if (result.wallet.balance) {
  // X402:     console.log(`  ${green(`Balance: ${result.wallet.balance}`)}`);
  // X402:   } else {
  // X402:     console.log(`  ${yellow(`Balance: checking...`)}`);
  // X402:   }
  // X402: } else {
  // X402:   console.log(`  ${red("No wallet found")}`);
  // X402: }

  // Providers (API Keys)
  console.log("\nProviders (API Keys)");
  if (result.providers.isReady) {
    for (const provider of result.providers.providers) {
      console.log(`  ${green(`${provider}: configured`)}`);
    }
    if (result.providers.hasOpenRouter) {
      console.log(`  ${green("OpenRouter: available (fallback for all models)")}`);
    }
    if (result.providers.configuredModels.length > 0) {
      console.log(`  ${green(`Accessible models: ${result.providers.configuredModels.length}`)}`);
    }
  } else {
    console.log(`  ${red("No API keys configured")}`);
    console.log(`  ${yellow("  Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or other provider env vars")}`);
  }

  // Network
  console.log("\nNetwork");
  if (result.network.blockrunApi.reachable) {
    console.log(
      `  ${green(`BlockRun API: reachable (${result.network.blockrunApi.latencyMs}ms)`)}`,
    );
  } else {
    console.log(`  ${red("BlockRun API: unreachable")}`);
  }
  if (result.network.localProxy.running) {
    console.log(`  ${green(`Local proxy: running on :${result.network.localProxy.port}`)}`);
  } else {
    console.log(`  ${red(`Local proxy: not running on :${result.network.localProxy.port}`)}`);
  }

  // Logs
  console.log("\nLogs");
  console.log(
    `  ${green(`Last 24h: ${result.logs.requestsLast24h} requests, ${result.logs.costLast24h} spent`)}`,
  );
  if (result.logs.errorsFound > 0) {
    console.log(`  ${yellow(`${result.logs.errorsFound} errors found in logs`)}`);
  }

  // Issues summary
  if (result.issues.length > 0) {
    console.log("\n⚠️  Issues Found:");
    for (const issue of result.issues) {
      console.log(`  • ${issue}`);
    }
  }
}

// Model options for doctor command
type DoctorModel = "sonnet" | "opus";

const DOCTOR_MODELS: Record<DoctorModel, { id: string; name: string; cost: string }> = {
  sonnet: {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    cost: "~$0.003",
  },
  opus: {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    cost: "~$0.01",
  },
};

// Send to AI for analysis
async function analyzeWithAI(
  diagnostics: DiagnosticResult,
  userQuestion?: string,
  model: DoctorModel = "sonnet",
): Promise<void> {
  // X402: // Check if wallet has funds
  // X402: if (diagnostics.wallet.isEmpty) {
  // X402:   console.log("\n💳 Wallet is empty - cannot call AI for analysis.");
  // X402:   console.log(`   Fund your wallet with USDC on Base: ${diagnostics.wallet.address}`);
  // X402:   console.log("   Get USDC: https://www.coinbase.com/price/usd-coin");
  // X402:   console.log("   Bridge to Base: https://bridge.base.org\n");
  // X402:   return;
  // X402: }

  // Check if API keys are available for the requested model
  const config = loadApiKeys();
  const modelConfig = DOCTOR_MODELS[model];
  const providerAccess = resolveProviderAccess(config, modelConfig.id);

  if (!providerAccess) {
    console.log(`\n💳 No API key configured for ${modelConfig.name}`);
    console.log(`   Configure ANTHROPIC_API_KEY or OPENROUTER_API_KEY env var`);
    if (!diagnostics.providers.hasOpenRouter) {
      console.log(`   OpenRouter can provide access to ${modelConfig.name}`);
    }
    console.log();
    return;
  }

  console.log(`\n📤 Sending to ${modelConfig.name} (${modelConfig.cost}) via ${providerAccess.provider}...\n`);

  try {
    // X402: const { key } = await resolveOrGenerateWalletKey();
    // X402: const { fetch: paymentFetch } = createPaymentFetch(key as `0x${string}`);

    // Use API key instead of x402 payment
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (providerAccess.provider === "anthropic") {
      headers["x-api-key"] = providerAccess.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "false";
    } else {
      // OpenAI-compatible format (OpenRouter, OpenAI, xai, etc.)
      headers["Authorization"] = `Bearer ${providerAccess.apiKey}`;
    }

    const isAnthropic = providerAccess.provider === "anthropic" || modelConfig.id.startsWith("anthropic/");
    const baseUrl = isAnthropic && !providerAccess.viaOpenRouter
      ? "https://api.anthropic.com/v1/messages"
      : `${providerAccess.baseUrl}/chat/completions`;

    const requestBody = isAnthropic && !providerAccess.viaOpenRouter
      ? {
          model: modelConfig.id.replace("anthropic/", ""),
          system: `You are a technical support expert for BlockRun and ClawRouter.
Analyze the diagnostics and:
1. Identify the root cause of any issues
2. Provide specific, actionable fix commands (bash)
3. Explain why the issue occurred briefly
4. Be concise but thorough
5. Format commands in code blocks`,
          messages: userQuestion
            ? [
                {
                  role: "user",
                  content: `Here are my system diagnostics:\n\n${JSON.stringify(diagnostics, null, 2)}\n\nUser's question: ${userQuestion}`,
                },
              ]
            : [
                {
                  role: "user",
                  content: `Here are my system diagnostics:\n\n${JSON.stringify(diagnostics, null, 2)}\n\nPlease analyze and help me fix any issues.`,
                },
              ],
          max_tokens: 1000,
        }
      : {
          model: modelConfig.id,
          stream: false,
          messages: [
            {
              role: "system",
              content: `You are a technical support expert for BlockRun and ClawRouter.
Analyze the diagnostics and:
1. Identify the root cause of any issues
2. Provide specific, actionable fix commands (bash)
3. Explain why the issue occurred briefly
4. Be concise but thorough
5. Format commands in code blocks`,
            },
            {
              role: "user",
              content: userQuestion
                ? `Here are my system diagnostics:\n\n${JSON.stringify(diagnostics, null, 2)}\n\nUser's question: ${userQuestion}`
                : `Here are my system diagnostics:\n\n${JSON.stringify(diagnostics, null, 2)}\n\nPlease analyze and help me fix any issues.`,
            },
          ],
          max_tokens: 1000,
        };

    const response = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`Error: ${response.status} - ${text}`);
      return;
    }

    const data = await response.json();
    let content: string | undefined;

    if (isAnthropic && !providerAccess.viaOpenRouter) {
      content = data.content?.[0]?.text;
    } else {
      content = data.choices?.[0]?.message?.content;
    }

    if (content) {
      console.log("🤖 AI Analysis:\n");
      console.log(content);
      console.log();
    } else {
      console.log("Error: No response from AI");
    }
  } catch (err) {
    console.log(`\nError calling AI: ${err instanceof Error ? err.message : String(err)}`);
    console.log("Try again or check your API key configuration.\n");
  }
}

// Main entry point
export async function runDoctor(
  userQuestion?: string,
  model: "sonnet" | "opus" = "sonnet",
): Promise<void> {
  console.log(`\n🩺 BlockRun Doctor v${VERSION}\n`);

  // Collect all diagnostics
  const [system, providers, network, logs] = await Promise.all([
    collectSystemInfo(),
    Promise.resolve(collectProviderInfo()), // X402: collectWalletInfo(),
    collectNetworkInfo(),
    collectLogInfo(),
  ]);

  const result: DiagnosticResult = {
    version: VERSION,
    timestamp: new Date().toISOString(),
    system,
    // X402: wallet,
    providers,
    network,
    logs,
    issues: [],
  };

  // Identify issues
  result.issues = identifyIssues(result);

  // Print to terminal
  printDiagnostics(result);

  // Send to AI for analysis
  await analyzeWithAI(result, userQuestion, model);
}
