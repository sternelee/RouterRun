/**
 * ClawRouter ProviderPlugin for OpenClaw
 *
 * Registers ClawRouter as an LLM provider in OpenClaw.
 * Uses a local proxy to handle direct provider API access via your own API keys.
 *
 * For API Key mode, configure provider API keys via:
 *   - Environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
 *   - Config file (~/.openclaw/clawrouter/config.json)
 *   - OpenClaw plugin config
 */

import type { ProviderPlugin } from "./types.js";
import { buildProviderModels } from "./models.js";
import type { ProxyHandle } from "./proxy.js";

// X402: import { loadApiKeys, CONFIG_FILE } from "./api-keys.js";

/**
 * State for the running proxy (set when plugin activates).
 */
let activeProxy: ProxyHandle | null = null;

/**
 * Update the proxy handle (called from index.ts when proxy starts).
 */
export function setActiveProxy(proxy: ProxyHandle): void {
  activeProxy = proxy;
}

export function getActiveProxy(): ProxyHandle | null {
  return activeProxy;
}

/**
 * ClawRouter provider plugin definition.
 */
export const clawrouterProvider: ProviderPlugin = {
  id: "clawrouter",
  label: "ClawRouter",
  docsPath: "https://github.com/BlockRunAI/ClawRouter",
  aliases: ["cr"],
  envVars: [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "XAI_API_KEY",
    "DEEPSEEK_API_KEY",
    "MOONSHOT_API_KEY",
    "NVIDIA_API_KEY",
    "OPENROUTER_API_KEY",
  ],

  get models() {
    if (!activeProxy) {
      // Fallback: use localhost proxy URL (allows config loading before proxy starts)
      return buildProviderModels("http://127.0.0.1:8402/v1");
    }
    return buildProviderModels(activeProxy.baseUrl);
  },

  // Auth methods for configuring provider API keys
  auth: [
    {
      id: "api-keys",
      label: "API Keys",
      hint: "Configure via environment variables or config file",
      kind: "custom",
      run: async (ctx: ProviderAuthContext): Promise<unknown> => {
        // X402: const apiKeys = loadApiKeys(ctx.config);
        // X402: const configured = getConfiguredProviders(apiKeys);
        // X402:
        // X402: Available providers (those with keys): ${configured.join(", ") || "none"}
        // X402:
        // X402: Set environment variables for your providers:
        // X402:   OPENAI_API_KEY
        // X402:   ANTHROPIC_API_KEY
        // X402:   GOOGLE_API_KEY
        // X402:   XAI_API_KEY
        // X402:   DEEPSEEK_API_KEY
        // X402:   MOONSHOT_API_KEY
        // X402:   NVIDIA_API_KEY
        // X402:   OPENROUTER_API_KEY
        // X402:
        // X402: Or create config file at: ${CONFIG_FILE}
        // X402: {
        // X402:   "providers": {
        // X402:     "openai": { "apiKey": "sk-..." },
        // X402:     "anthropic": { "apiKey": "sk-ant-..." },
        // X402:     ...
        // X402:   }
        // X402: }
        // X402:
        // X402: For more info, run: clawrouter keys
        // X402:
        return {
          text: `Configure API keys via environment variables or config file at ${CONFIG_FILE}\n\n` +
            `Set environment variables:\n` +
            `  OPENAI_API_KEY\n` +
            `  ANTHROPIC_API_KEY\n` +
            `  GOOGLE_API_KEY\n` +
            `  XAI_API_KEY\n` +
            `  DEEPSEEK_API_KEY\n` +
            `  MOONSHOT_API_KEY\n` +
            `  NVIDIA_API_KEY\n` +
            `  OPENROUTER_API_KEY\n\n` +
            `Or create config file:\n` +
            `  ${CONFIG_FILE}\n` +
            `{\n` +
            `  "providers": {\n` +
            `    "openai": { "apiKey": "sk-..." },\n` +
            `    "anthropic": { "apiKey": "sk-ant-..." },\n` +
            `    "google": { "apiKey": "AI..." },\n` +
            `    ...\n` +
            `  }\n` +
            `}\n\n` +
            `See: clawrouter keys command to check configured status`,
        };
      },
    },
  ],
};
