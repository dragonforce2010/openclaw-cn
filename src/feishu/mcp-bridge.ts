import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { FeishuDomain } from "../config/types.feishu.js";
import { getChildLogger } from "../logging.js";

const logger = getChildLogger({ module: "feishu-mcp-bridge" });

/** Configuration for the Feishu MCP Bridge. */
export type FeishuMcpBridgeConfig = {
  appId: string;
  appSecret: string;
  /** API domain: "feishu" (China) or "lark" (international). */
  domain: FeishuDomain;
  /** lark-mcp tool preset (e.g. "preset.default"). Default: "preset.default". */
  preset?: string;
};

/** Resolved mcporter-compatible JSON config for lark-mcp. */
export type FeishuMcpServerConfig = {
  command: string;
  args: string[];
  env?: Record<string, string>;
};

/**
 * Build the mcporter-compatible config entry for lark-mcp.
 *
 * This generates a JSON-serializable config that can be written to
 * a mcporter config file or used directly to spawn the lark-mcp process.
 */
export function buildFeishuMcpConfig(config: FeishuMcpBridgeConfig): FeishuMcpServerConfig {
  const preset = config.preset?.trim() || "preset.default";
  const domain = config.domain === "lark" ? "lark" : "feishu";

  return {
    command: "npx",
    args: [
      "-y",
      "@larksuiteoapi/lark-mcp",
      "mcp",
      "-a",
      config.appId,
      "-s",
      config.appSecret,
      "-d",
      domain,
      "-t",
      preset,
    ],
  };
}

/**
 * Build the full mcporter JSON config file content for lark-mcp.
 */
export function buildFeishuMcpConfigJson(config: FeishuMcpBridgeConfig): string {
  const serverConfig = buildFeishuMcpConfig(config);
  const mcpConfig = {
    mcpServers: {
      "lark-mcp": serverConfig,
    },
  };
  return JSON.stringify(mcpConfig, null, 2);
}

/**
 * Resolve the path for the feishu-mcp config file.
 * Uses ~/.openclaw/config/feishu-mcp.json by default.
 */
export function resolveFeishuMcpConfigPath(): string {
  return path.join(os.homedir(), ".openclaw", "config", "feishu-mcp.json");
}

// Singleton state for the MCP bridge child process.
let mcpProcess: ChildProcess | null = null;
let mcpProcessActive = false;

/**
 * Start the Feishu MCP Bridge.
 *
 * Spawns lark-mcp as a stdio MCP Server child process using the provided
 * Feishu credentials. Writes a mcporter-compatible config file that other
 * tools (e.g. mcporter CLI) can discover.
 */
export async function startFeishuMcpBridge(config: FeishuMcpBridgeConfig): Promise<void> {
  if (mcpProcessActive) {
    logger.info("Feishu MCP Bridge is already running, skipping start");
    return;
  }

  const serverConfig = buildFeishuMcpConfig(config);

  // Write mcporter-compatible config
  const configPath = resolveFeishuMcpConfigPath();
  const configDir = path.dirname(configPath);
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const configJson = buildFeishuMcpConfigJson(config);
    fs.writeFileSync(configPath, configJson, "utf-8");
    logger.info(`Feishu MCP config written to ${configPath}`);
  } catch (err) {
    logger.warn(`Failed to write Feishu MCP config: ${err}`);
    // Non-fatal: the bridge can still work without the config file
  }

  // Spawn lark-mcp subprocess
  try {
    const child = spawn(serverConfig.command, serverConfig.args, {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
      env: { ...process.env, ...serverConfig.env },
    });

    child.on("error", (err) => {
      logger.error(`Feishu MCP Bridge process error: ${err.message}`);
      mcpProcessActive = false;
      mcpProcess = null;
    });

    child.on("exit", (code, signal) => {
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      logger.info(`Feishu MCP Bridge process exited (${reason})`);
      mcpProcessActive = false;
      mcpProcess = null;
    });

    child.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) logger.debug(`[lark-mcp stderr] ${msg}`);
    });

    mcpProcess = child;
    mcpProcessActive = true;
    logger.info(
      `Feishu MCP Bridge started (pid: ${child.pid}, domain: ${config.domain}, preset: ${serverConfig.args[serverConfig.args.length - 1]})`,
    );
  } catch (err) {
    logger.error(`Failed to start Feishu MCP Bridge: ${err}`);
    throw err;
  }
}

/**
 * Gracefully stop the Feishu MCP Bridge.
 */
export async function stopFeishuMcpBridge(): Promise<void> {
  if (!mcpProcess || !mcpProcessActive) {
    return;
  }

  logger.info("Stopping Feishu MCP Bridge...");
  try {
    mcpProcess.kill("SIGTERM");
  } catch {
    // Process may already be gone
  }
  mcpProcess = null;
  mcpProcessActive = false;
}

/**
 * Check if the Feishu MCP Bridge is currently active.
 */
export function isFeishuMcpBridgeActive(): boolean {
  return mcpProcessActive;
}
