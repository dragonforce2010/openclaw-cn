import { describe, it, expect } from "vitest";
import { buildFeishuMcpConfig, buildFeishuMcpConfigJson } from "./mcp-bridge.js";

describe("buildFeishuMcpConfig", () => {
  it("should generate config with feishu domain", () => {
    const config = buildFeishuMcpConfig({
      appId: "cli_test123",
      appSecret: "secret456",
      domain: "feishu",
    });

    expect(config.command).toBe("npx");
    expect(config.args).toContain("@larksuiteoapi/lark-mcp");
    expect(config.args).toContain("mcp");
    expect(config.args).toContain("-a");
    expect(config.args).toContain("cli_test123");
    expect(config.args).toContain("-s");
    expect(config.args).toContain("secret456");
    expect(config.args).toContain("-d");
    expect(config.args).toContain("feishu");
    expect(config.args).toContain("-t");
    expect(config.args).toContain("preset.default");
  });

  it("should generate config with lark domain", () => {
    const config = buildFeishuMcpConfig({
      appId: "cli_lark_app",
      appSecret: "lark_secret",
      domain: "lark",
    });

    expect(config.args).toContain("-d");
    expect(config.args).toContain("lark");
  });

  it("should use custom preset", () => {
    const config = buildFeishuMcpConfig({
      appId: "cli_test",
      appSecret: "secret",
      domain: "feishu",
      preset: "preset.im.default",
    });

    expect(config.args).toContain("-t");
    expect(config.args).toContain("preset.im.default");
  });

  it("should fall back to preset.default when preset is empty", () => {
    const config = buildFeishuMcpConfig({
      appId: "cli_test",
      appSecret: "secret",
      domain: "feishu",
      preset: "  ",
    });

    expect(config.args).toContain("preset.default");
  });
});

describe("buildFeishuMcpConfigJson", () => {
  it("should generate valid mcporter JSON config", () => {
    const json = buildFeishuMcpConfigJson({
      appId: "cli_app_id",
      appSecret: "app_secret_value",
      domain: "feishu",
    });

    const parsed = JSON.parse(json);
    expect(parsed.mcpServers).toBeDefined();
    expect(parsed.mcpServers["lark-mcp"]).toBeDefined();
    expect(parsed.mcpServers["lark-mcp"].command).toBe("npx");
    expect(parsed.mcpServers["lark-mcp"].args).toContain("cli_app_id");
    expect(parsed.mcpServers["lark-mcp"].args).toContain("app_secret_value");
  });
});
