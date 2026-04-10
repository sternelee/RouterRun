import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  renameSync: vi.fn(),
}));

vi.mock("node:net", () => ({
  connect: vi.fn(() => {
    const handlers: Record<string, (() => void) | undefined> = {};
    const socket = {
      destroy: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        handlers[event] = handler;
        return socket;
      }),
      setTimeout: vi.fn(() => socket),
    };
    setTimeout(() => handlers.error?.(), 0);
    return socket;
  }),
}));

describe("plugin lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    const proc = process as NodeJS.Process & {
      __clawrouterProxyStarted?: boolean;
      __clawrouterDeferredStartTimer?: ReturnType<typeof setTimeout>;
      __clawrouterStartupGeneration?: number;
    };
    proc.__clawrouterProxyStarted = undefined;
    proc.__clawrouterDeferredStartTimer = undefined;
    proc.__clawrouterStartupGeneration = undefined;
  });

  it("clears deferred proxy startup state during deactivate", async () => {
    vi.useFakeTimers();

    const { default: plugin } = await import("./index.js");
    const proc = process as NodeJS.Process & {
      __clawrouterProxyStarted?: boolean;
      __clawrouterDeferredStartTimer?: ReturnType<typeof setTimeout>;
    };

    let fired = false;
    proc.__clawrouterProxyStarted = true;
    proc.__clawrouterDeferredStartTimer = setTimeout(() => {
      fired = true;
    }, 250);

    plugin.deactivate?.({
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    } as unknown as import("./types.js").OpenClawPluginApi);

    await vi.advanceTimersByTimeAsync(300);

    expect(fired).toBe(false);
    expect(proc.__clawrouterProxyStarted).toBe(false);
    expect(proc.__clawrouterDeferredStartTimer).toBeUndefined();
  });

  it("closes stale in-flight proxy startups that finish after deactivate", async () => {
    vi.useFakeTimers();

    const close = vi.fn(async () => {});
    let resolveStart!: (value: {
      close: typeof close;
      balanceMonitor: { checkBalance: ReturnType<typeof vi.fn> };
      solanaAddress?: string;
    }) => void;

    vi.doMock("./proxy.js", () => ({
      getProxyPort: () => 8402,
      startProxy: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveStart = resolve;
          }),
      ),
    }));
    vi.doMock("./auth.js", () => ({
      resolveOrGenerateWalletKey: vi.fn(async () => ({
        key: "0x1234567890123456789012345678901234567890123456789012345678901234",
        address: "0x1111111111111111111111111111111111111111",
        source: "saved",
      })),
      setupSolana: vi.fn(),
      savePaymentChain: vi.fn(),
      resolvePaymentChain: vi.fn(async () => "base"),
      WALLET_FILE: "/tmp/wallet",
      MNEMONIC_FILE: "/tmp/mnemonic",
    }));
    vi.doMock("./provider.js", () => ({
      blockrunProvider: { id: "blockrun" },
      setActiveProxy: vi.fn(),
    }));
    vi.doMock("./models.js", () => ({
      OPENCLAW_MODELS: [],
    }));
    vi.doMock("./web-search-provider.js", () => ({
      BLOCKRUN_EXA_PROVIDER_ID: "blockrun-exa",
      blockrunExaWebSearchProvider: { id: "blockrun-exa" },
    }));
    vi.doMock("./partners/index.js", () => ({
      buildPartnerTools: vi.fn(() => []),
      PARTNER_SERVICES: [],
    }));
    vi.doMock("./commands/stats.js", () => ({
      createStatsCommand: vi.fn(() => ({ name: "stats", handler: vi.fn() })),
    }));
    vi.doMock("./commands/exclude.js", () => ({
      createExcludeCommand: vi.fn(() => ({ name: "exclude", handler: vi.fn() })),
    }));
    vi.doMock("./mcp-config.js", () => ({
      BLOCKRUN_MCP_SERVER_NAME: "blockrun",
      createBlockrunMcpServerDefinition: vi.fn(() => ({ command: "npx", args: [] })),
      ensureBlockrunMcpServerConfig: vi.fn(() => ({ changed: false, status: "preserved" })),
      removeManagedBlockrunMcpServerConfig: vi.fn(),
    }));
    vi.doMock("./version.js", () => ({
      VERSION: "test",
    }));
    vi.doMock("./exclude-models.js", () => ({
      loadExcludeList: vi.fn(() => new Set()),
    }));

    const originalArgv = process.argv;
    process.argv = [...originalArgv, "gateway"];

    try {
      const { default: plugin } = await import("./index.js");
      const api = {
        id: "test",
        name: "test",
        source: "local",
        config: {},
        pluginConfig: { routing: {} },
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        registerProvider: vi.fn(),
        registerImageGenerationProvider: vi.fn(),
        registerMusicGenerationProvider: vi.fn(),
        registerWebSearchProvider: vi.fn(),
        registerTool: vi.fn(),
        registerHook: vi.fn(),
        registerHttpRoute: vi.fn(),
        registerService: vi.fn(),
        registerCommand: vi.fn(),
        resolvePath: vi.fn((input: string) => input),
        on: vi.fn(),
      } as unknown as import("./types.js").OpenClawPluginApi;

      plugin.register?.(api);
      await vi.runAllTimersAsync();
      expect(typeof resolveStart).toBe("function");

      plugin.deactivate?.(api);

      resolveStart({
        close,
        balanceMonitor: {
          checkBalance: vi.fn(async () => ({ isEmpty: true, isLow: false, balanceUSD: "0.00" })),
        },
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      process.argv = originalArgv;
    }
  });
});
