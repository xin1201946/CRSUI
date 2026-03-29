"use client"

import * as React from "react"
import {
  CCRSTerminal,
  type CommandDefinition,
  type CommandContext,
  type OutputItem,
  type TerminalRef,
  createTableOutput,
  createListOutput,
  createTextOutput,
  createErrorOutput,
  createHtmlOutput,
  createComponentOutput,
} from "@/components/terminal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ============== 示例自定义命令 ==============

const exampleCommands: CommandDefinition[] = [
  {
    name: "date",
    description: "显示当前日期时间",
    execute: () => [
      createTextOutput(new Date().toLocaleString("zh-CN", { dateStyle: "full", timeStyle: "long" })),
    ],
  },
  {
    name: "json",
    description: "解析并显示 JSON 数据 (示例: json)",
    execute: () => {
      const sampleData = {
        users: [
          { id: 1, name: "张三", role: "admin" },
          { id: 2, name: "李四", role: "user" },
          { id: 3, name: "王五", role: "user" },
        ],
      }
      return [
        createTableOutput(
          ["ID", "姓名", "角色"],
          sampleData.users.map((u) => [u.id, u.name, u.role])
        ),
      ]
    },
  },
  {
    name: "list",
    description: "显示列表示例",
    execute: () => [
      createListOutput([
        "这是第一项",
        "这是第二项",
        "这是第三项",
        "支持任意内容",
      ]),
    ],
  },
  {
    name: "html",
    description: "渲染 HTML 内容示例",
    execute: () => [
      createHtmlOutput(`
        <div style="padding: 12px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px;">HTML 渲染示例</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">这是通过 HTML 渲染的内容，支持样式和布局。</p>
        </div>
      `),
    ],
  },
  {
    name: "component",
    description: "渲染 React 组件示例",
    execute: () => [
      createComponentOutput(
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
          <Badge variant="outline">React</Badge>
          <Badge variant="secondary">组件</Badge>
          <span className="text-sm text-muted-foreground">
            这是一个 React 组件渲染示例
          </span>
          <Button size="sm" variant="outline" onClick={() => alert("点击了按钮!")}>
            点击我
          </Button>
        </div>
      ),
    ],
  },
  {
    name: "calc",
    description: "简单计算器 (示例: calc 1+2*3)",
    execute: (ctx) => {
      const expr = ctx.args.join("")
      try {
        // 安全的数学表达式计算
        const sanitized = expr.replace(/[^0-9+\-*/().]/g, "")
        if (!sanitized) {
          return [createErrorOutput("请输入有效的数学表达式")]
        }
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${sanitized})`)()
        return [createTextOutput(`${expr} = ${result}`)]
      } catch {
        return [createErrorOutput(`无法计算: ${expr}`)]
      }
    },
  },
  {
    name: "grep",
    description: "从管道输入中过滤包含关键词的行",
    execute: (ctx) => {
      const keyword = ctx.args[0]
      if (!keyword) {
        return [createErrorOutput("用法: grep <关键词>")]
      }

      if (!ctx.pipeInput || ctx.pipeInput.length === 0) {
        return [createErrorOutput("grep 需要管道输入")]
      }

      // 从管道输入中提取文本并过滤
      const filteredItems: string[] = []
      ctx.pipeInput.forEach((item) => {
        if (item.type === "text" && typeof item.content === "string") {
          const lines = item.content.split("\n")
          lines.forEach((line) => {
            if (line.toLowerCase().includes(keyword.toLowerCase())) {
              filteredItems.push(line)
            }
          })
        } else if (item.type === "list") {
          const listContent = item.content as { items: string[] }
          listContent.items.forEach((listItem) => {
            if (typeof listItem === "string" && listItem.toLowerCase().includes(keyword.toLowerCase())) {
              filteredItems.push(listItem)
            }
          })
        }
      })

      if (filteredItems.length === 0) {
        return [createTextOutput(`未找到包含 "${keyword}" 的内容`)]
      }

      return [createListOutput(filteredItems)]
    },
  },
  {
    name: "sleep",
    description: "等待指定秒数 (示例: sleep 2)",
    execute: async (ctx) => {
      const seconds = parseInt(ctx.args[0]) || 1
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
      return [createTextOutput(`等待了 ${seconds} 秒`)]
    },
  },
  {
    name: "env",
    description: "显示环境信息",
    execute: () => [
      createTableOutput(
        ["属性", "值"],
        [
          ["平台", typeof navigator !== "undefined" ? navigator.platform : "unknown"],
          ["语言", typeof navigator !== "undefined" ? navigator.language : "unknown"],
          ["时区", Intl.DateTimeFormat().resolvedOptions().timeZone],
          ["屏幕", typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "unknown"],
        ]
      ),
    ],
  },
  {
    name: "banner",
    description: "显示 CCRS Banner",
    execute: () => [
      createHtmlOutput(`
        <pre style="color: #00ff00; font-family: monospace; line-height: 1.2;">
   ____  ____  ____  ____    _   _ ___ 
  / ___|/ ___||  _ \\/ ___|  | | | |_ _|
 | |   | |    | |_) \\___ \\  | | | || | 
 | |___| |___ |  _ < ___) | | |_| || | 
  \\____|\\____||_| \\_\\____/   \\___/|___|
                                       
        </pre>
        <p style="color: #888; margin-top: 8px;">Casting Character Recognition System Terminal v1.0</p>
      `),
    ],
  },
]

// ============== 模拟远程执行器 ==============

async function remoteExecutor(
  command: string,
  ctx: CommandContext
): Promise<OutputItem[]> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000))

  // 模拟一些"远程"命令
  const [cmd, ...args] = command.split(/\s+/)

  switch (cmd) {
    case "fetch":
      return [
        createTextOutput(`[远程] 获取数据: ${args.join(" ") || "默认资源"}`),
        createTableOutput(
          ["状态", "响应时间", "数据大小"],
          [["200 OK", `${Math.floor(Math.random() * 200 + 50)}ms`, `${Math.floor(Math.random() * 1000 + 100)} bytes`]]
        ),
      ]

    case "status":
      return [
        createTextOutput("[远程] 服务器状态:"),
        createTableOutput(
          ["服务", "状态", "延迟"],
          [
            ["API Server", "运行中", `${Math.floor(Math.random() * 50 + 10)}ms`],
            ["Database", "运行中", `${Math.floor(Math.random() * 20 + 5)}ms`],
            ["Cache", "运行中", `${Math.floor(Math.random() * 10 + 1)}ms`],
          ]
        ),
      ]

    case "whoami":
      return [createTextOutput("[远程] 当前用户: admin@ccrs-server")]

    default:
      return [createErrorOutput(`[远程] 命令未找到: ${cmd}`)]
  }
}

// ============== 页面组件 ==============

export default function TerminalPage() {
  const terminalRef = React.useRef<TerminalRef>(null)

  const welcomeMessage = (
    <div>
      <p className="text-muted-foreground">
        CCRS Terminal [v1.0]
        <br/>
        输入 <span>help</span> 查看可用命令
      </p>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4  overflow-hidden p-4">

      {/*<div className="flex shrink-0 items-center justify-between">*/}
      {/*  <div className="flex gap-2">*/}
      {/*    <Button*/}
      {/*      variant="outline"*/}
      {/*      size="sm"*/}
      {/*      onClick={() => terminalRef.current?.execute("banner")}*/}
      {/*    >*/}
      {/*      显示 Banner*/}
      {/*    </Button>*/}
      {/*    <Button*/}
      {/*      variant="outline"*/}
      {/*      size="sm"*/}
      {/*      onClick={() => terminalRef.current?.clear()}*/}
      {/*    >*/}
      {/*      清空*/}
      {/*    </Button>*/}
      {/*  </div>*/}
      {/*</div>*/}

      <CCRSTerminal
        ref={terminalRef}
        className="min-h-0 flex-1"
        prompt="ccrs>"
        initialCommands={exampleCommands}
        welcomeMessage={welcomeMessage}
        remoteExecutor={remoteExecutor}
      />
    </div>
  )
}
