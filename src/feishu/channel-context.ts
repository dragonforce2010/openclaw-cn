/**
 * Feishu channel-aware context module.
 *
 * Provides contextual hints for the Agent when running in a Feishu channel,
 * guiding it to prefer Feishu-specific MCP tools for document, messaging,
 * and platform operations.
 */

export type FeishuChannelContextOptions = {
  /** Whether the lark-mcp bridge is currently active. */
  mcpBridgeActive?: boolean;
};

/**
 * Build the Feishu channel context hint string.
 *
 * This string is injected into the Agent's system prompt when the current
 * conversation originates from Feishu, helping the Agent disambiguate
 * between multiple MCP tool providers (e.g., choosing lark-mcp over
 * generic document/messaging tools).
 */
export function buildFeishuChannelContext(options: FeishuChannelContextOptions = {}): string {
  const lines: string[] = [
    `当前对话通道：飞书（Feishu/Lark）`,
    `- 当用户提到"文档"、"表格"、"知识库"等，默认为飞书云文档`,
    `- 当用户说"发给我"、"发送"等，通过当前飞书对话发送`,
  ];

  if (options.mcpBridgeActive) {
    lines.push(
      "- 操作飞书平台资源请使用 lark-mcp 相关工具（如 docx.*, im.*, bitable.*, wiki.*, calendar.*, task.* 等）",
      "- 创建飞书文档请使用 docx.builtin.import 工具",
      "- 搜索飞书文档请使用 docx.builtin.search 工具",
    );
  }

  lines.push("- 对于消息中包含的飞书文档链接，系统已自动解析内容并注入上下文，无需再次读取");

  return lines.join("\n");
}
