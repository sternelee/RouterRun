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

import type { ProviderPlugin, ProviderAuthContext, ProviderAuthResult } from "./types.js";
import { buildProviderModels } from "./models.js";
import type { ProxyHandle } from "./proxy.js";
import { CONFIG_FILE } from "./api-keys.js";

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
      run: async (_ctx: ProviderAuthContext): Promise<ProviderAuthResult> => {
        // Return notes with configuration instructions (no profiles needed for local proxy)
        return {
          profiles: [],
          notes: [
            `Configure API keys via environment variables or config file at ${CONFIG_FILE}`,
            ``,
            `Set environment variables:`,
            `  OPENAI_API_KEY`,
            `  ANTHROPIC_API_KEY`,
            `  GOOGLE_API_KEY`,
            `  XAI_API_KEY`,
            `  DEEPSEEK_API_KEY`,
            `  MOONSHOT_API_KEY`,
            `  NVIDIA_API_KEY`,
            `  OPENROUTER_API_KEY`,
            ``,
            `Or create config file:`,
            `  ${CONFIG_FILE}`,
            `{`,
            `  "providers": {`,
            `    "openai": { "apiKey": "sk-..." },`,
            `    "anthropic": { "apiKey": "sk-ant-..." },`,
            `    "google": { "apiKey": "AI..." },`,
            `    ...`,
            `  }`,
            `}`,
            ``,
            `See: clawrouter keys command to check configured status`,
          ],
        };
      },
    },
  ],
};
