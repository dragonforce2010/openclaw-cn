import { describe, it, expect } from "vitest";
import { buildFeishuChannelContext } from "./channel-context.js";

describe("buildFeishuChannelContext", () => {
  it("should include basic channel info without MCP bridge", () => {
    const context = buildFeishuChannelContext();

    expect(context).toContain("飞书");
    expect(context).toContain("Feishu/Lark");
    expect(context).toContain("飞书云文档");
    expect(context).toContain("飞书对话");
    expect(context).toContain("自动解析");
    // Should NOT contain MCP tool hints
    expect(context).not.toContain("lark-mcp");
    expect(context).not.toContain("docx.*");
  });

  it("should include MCP tool hints when bridge is active", () => {
    const context = buildFeishuChannelContext({ mcpBridgeActive: true });

    expect(context).toContain("飞书");
    expect(context).toContain("lark-mcp");
    expect(context).toContain("docx.*");
    expect(context).toContain("im.*");
    expect(context).toContain("bitable.*");
    expect(context).toContain("wiki.*");
    expect(context).toContain("calendar.*");
    expect(context).toContain("task.*");
    expect(context).toContain("docx.builtin.import");
    expect(context).toContain("docx.builtin.search");
  });

  it("should not include MCP tool hints when bridge is inactive", () => {
    const context = buildFeishuChannelContext({ mcpBridgeActive: false });

    expect(context).not.toContain("lark-mcp");
    expect(context).not.toContain("docx.*");
  });

  it("should always include auto-parse note", () => {
    const withBridge = buildFeishuChannelContext({ mcpBridgeActive: true });
    const withoutBridge = buildFeishuChannelContext({ mcpBridgeActive: false });

    expect(withBridge).toContain("自动解析");
    expect(withoutBridge).toContain("自动解析");
  });
});
