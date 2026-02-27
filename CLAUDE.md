# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build
npm run build           # Build with tsup
npm run dev             # Watch mode

# Testing
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:resilience:quick  # Quick resilience tests

# Code quality
npm run lint            # ESLint
npm run format          # Prettier
npm run typecheck       # TypeScript type checking

# CLI
npx @blockrun/clawrouter              # Start standalone proxy
npx @blockrun/clawrouter doctor       # AI-powered diagnostics
npx @blockrun/clawrouter partners    # List partner APIs
```

## Architecture Overview

ClawRouter is a smart LLM router for OpenClaw that routes requests to the cheapest capable model while handling x402 micropayments. Key architectural concepts:

### Request Flow

```
OpenClaw/App → Proxy (localhost:8402) → BlockRun API → Provider (OpenAI/Anthropic/etc)
                ↓
            1. Deduplication (SHA-256 cache)
            2. Smart Routing (15-dimension classifier)
            3. Balance Check (USDC on Base)
            4. x402 Payment (EIP-712 signature)
            5. Fallback Chain (if provider errors)
            6. SSE Streaming (heartbeat while waiting)
```

### Key Components

**Core Proxy (`src/proxy.ts`)**
- HTTP server listening on port 8402 (configurable via `BLOCKRUN_PROXY_PORT`)
- Handles OpenAI-compatible `/v1/chat/completions` requests
- Implements request deduplication to prevent double-charging on retries
- SSE heartbeat for streaming requests (prevents timeout during x402)
- Fallback chain when providers return errors

**Routing Engine (`src/router/`)**
- `index.ts`: Entry point with `route()` function
- `rules.ts`: 15-dimension weighted scorer (100% local, <1ms)
- `selector.ts`: Tier → model selection with fallback chain
- Four tiers: SIMPLE, MEDIUM, COMPLEX, REASONING
- Three routing profiles: eco (cheapest), auto (balanced), premium (best quality)

**Payment System (`src/x402.ts`)**
- Implements x402 protocol for per-request payments
- EIP-712 typed data signing with wallet private key
- Pre-authorization cache skips 402 round trip on subsequent requests

**Compression (`src/compression/`)**
- 7-layer context compression (dedup, whitespace, dictionary, paths, JSON, observation, dynamic codebook)
- Reduces token usage by 15-40%
- Codebook header prepended to user message for LLM decoding

**Plugin Integration (`src/index.ts`)**
- OpenClaw plugin registration via `register(api)`
- Injects models config into `~/.openclaw/openclaw.json`
- Registers provider, tools, commands (`/wallet`, `/stats`, `/partners`)
- Starts proxy in gateway mode only (not CLI commands)

### Type Definitions

Types are defined locally in `src/types.ts` to avoid depending on internal OpenClaw paths:
- `OpenClawPluginApi`: Plugin SDK interface (duck-typed)
- `ModelProviderConfig`: Provider registration shape
- `PluginCommandDefinition`: CLI command handler

### Configuration

Routing configuration in `src/router/config.ts` defines:
- `tierBoundaries`: Score thresholds between tiers
- `dimensionWeights`: 15 scoring dimension weights
- `tiers`: Model mappings for each tier/routing profile
- `overrides`: Special cases (large context, structured output, agentic mode)

Wallet key resolution (`src/auth.ts`):
1. Read from `~/.openclaw/blockrun/wallet.key`
2. Check `BLOCKRUN_WALLET_KEY` environment variable
3. Auto-generate new wallet if neither exists

## Important Patterns

### Local-Only Routing
The router classifies requests entirely locally using rule-based scoring. No external API calls are made for model selection - this ensures <1ms latency and works offline.

### Non-Custodial Payment
- Wallet private key never leaves the machine
- x402 signatures are generated locally via viem's `signTypedData`
- USDC is held in user's wallet until spent per-request

### Gateway Mode Detection
The proxy only starts when in gateway mode (`isGatewayMode()`). This prevents the proxy from keeping the process alive during CLI commands like `openclaw plugins list`.

### Completion Mode Detection
When running `openclaw completion --shell zsh`, the plugin skips heavy initialization. Logging to stdout during completion would corrupt the generated script.

### Atomic Config Writes
When injecting models into OpenClaw's config file, writes use temp file + rename pattern to prevent partial writes that could corrupt other plugins' settings.

### Fallback Chain
When a provider returns error status (400, 401, 402, 403, 429, 500, 502, 503, 504), the proxy tries the next model in the tier's fallback chain. Only non-provider errors (malformed requests, auth failures) stop fallback immediately.

## Testing

Tests use Vitest. Key test patterns:
- `src/proxy.*.test.ts`: Proxy server integration tests
- `src/response-cache.*.test.ts`: Cache edge cases and performance
- `test/resilience-*.ts`: Long-running stability and error recovery
- `test/docker/`: Docker-based integration tests

To run a single test file:
```bash
npx vitest run src/proxy.test.ts
```

## Common Issues

**Port Already in Use (EADDRINUSE):**
- Check if OpenClaw gateway is already running: `openclaw gateway status`
- Use `BLOCKRUN_PROXY_PORT` env var to change port

**Wallet Balance Empty:**
- Fund wallet with USDC on Base: address printed on first install
- Run `/wallet` command in OpenClaw or `npx @blockrun/clawrouter doctor`

**Models Not Showing in Picker:**
- Plugin injects config into `~/.openclaw/openclaw.json`
- Restart OpenClaw gateway after install
- Check logs for injection errors

**Proxy Not Starting:**
- Run `npx @blockrun/clawrouter doctor` for AI-powered diagnostics
- Check if `CLAWROUTER_DISABLED=true` env var is set

## Adding New Models

1. Add pricing in `src/models.ts`: `BLOCKRUN_MODELS` object
2. Update tiers in `src/router/config.ts`: add to appropriate tier config
3. Add alias in `KEY_MODEL_ALIASES` (index.ts) if desired for `/model` picker
4. Update routing profiles (eco/auto/premium tiers) in config

## Doctor Command

The `doctor` command collects system diagnostics and sends them to Claude (Sonnet by default, Opus optional) for analysis:
- System info (OS, Node version, memory)
- Wallet status (address, balance, key file location)
- Network connectivity (BlockRun API, local proxy)
- Usage logs (last 24h requests and cost)

Cost: Sonnet ~$0.003, Opus ~$0.01 per diagnosis.
