"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

// ============== 类型定义 ==============

export interface CommandContext {
  args: string[]
  rawInput: string
  flags: Record<string, string | boolean>
  pipeInput?: OutputItem[]
  terminal: TerminalRef
}

export interface OutputItem {
  type: "text" | "html" | "table" | "list" | "error" | "component" | "loading"
  content: React.ReactNode | string | object
  timestamp?: Date
  className?: string
}

export interface HistoryEntry {
  command: string
  outputs: OutputItem[]
  timestamp: Date
}

export interface CommandDefinition {
  name: string
  description?: string
  execute: (ctx: CommandContext) => Promise<OutputItem[]> | OutputItem[]
}

export interface TerminalRef {
  print: (output: OutputItem | OutputItem[]) => void
  clear: () => void
  execute: (command: string) => Promise<void>
  registerCommand: (cmd: CommandDefinition) => void
  unregisterCommand: (name: string) => void
  getHistory: () => HistoryEntry[]
}

export interface CCRSTerminalProps {
  className?: string
  prompt?: string
  initialCommands?: CommandDefinition[]
  welcomeMessage?: React.ReactNode
  onCommandExecute?: (command: string) => void
  remoteExecutor?: (command: string, ctx: CommandContext) => Promise<OutputItem[]>
}

// ============== 工具函数 ==============

function parseCommand(input: string): { name: string; args: string[]; flags: Record<string, string | boolean> } {
  const parts = input.trim().split(/\s+/)
  const name = parts[0] || ""
  const args: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    if (part.startsWith("--")) {
      const [key, value] = part.slice(2).split("=")
      flags[key] = value ?? true
    } else if (part.startsWith("-")) {
      flags[part.slice(1)] = true
    } else {
      args.push(part)
    }
  }

  return { name, args, flags }
}

function splitByOperator(input: string, operator: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  let quoteChar = ""

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
      current += char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ""
      current += char
    } else if (!inQuotes && input.slice(i, i + operator.length) === operator) {
      if (current.trim()) result.push(current.trim())
      current = ""
      i += operator.length - 1
    } else {
      current += char
    }
  }

  if (current.trim()) result.push(current.trim())
  return result
}

// ============== 输出渲染组件 ==============

function RenderOutput({ item }: { item: OutputItem }) {
  switch (item.type) {
    case "text":
      return (
        <div className={cn("whitespace-pre-wrap font-mono text-sm", item.className)}>
          {item.content as React.ReactNode}
        </div>
      )

    case "html":
      return (
        <div
          className={cn("terminal-html", item.className)}
          dangerouslySetInnerHTML={{ __html: item.content as string }}
        />
      )

    case "error":
      return (
        <div className={cn("text-red-500 font-mono text-sm", item.className)}>
          {item.content as React.ReactNode}
        </div>
      )

    case "loading":
      return (
        <div className={cn("flex items-center gap-2 text-muted-foreground font-mono text-sm", item.className)}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{(item.content as React.ReactNode) || "执行中..."}</span>
        </div>
      )

    case "table":
      const tableData = item.content as { headers?: string[]; rows: (string | number)[][] }
      return (
        <div className={cn("my-2 rounded border border-border overflow-hidden", item.className)}>
          <Table>
            {tableData.headers && (
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {tableData.headers.map((header, i) => (
                    <TableHead key={i} className="font-mono text-xs">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {tableData.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="font-mono text-xs">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )

    case "list":
      const listData = item.content as { items: (string | React.ReactNode)[]; ordered?: boolean }
      const ListTag = listData.ordered ? "ol" : "ul"
      return (
        <ListTag
          className={cn(
            "my-2 ml-4 font-mono text-sm",
            listData.ordered ? "list-decimal" : "list-disc",
            item.className
          )}
        >
          {listData.items.map((listItem, i) => (
            <li key={i} className="py-0.5">
              {listItem}
            </li>
          ))}
        </ListTag>
      )

    case "component":
      return <div className={cn("my-2", item.className)}>{item.content as React.ReactNode}</div>

    default:
      return null
  }
}

// ============== 主组件 ==============

export const CCRSTerminal = React.forwardRef<TerminalRef, CCRSTerminalProps>(
  (
    {
      className,
      prompt = "ccrs>",
      initialCommands = [],
      welcomeMessage,
      onCommandExecute,
      remoteExecutor,
    },
    ref
  ) => {
    const [history, setHistory] = React.useState<HistoryEntry[]>([])
    const [inputValue, setInputValue] = React.useState("")
    const [historyIndex, setHistoryIndex] = React.useState(-1)
    const [isExecuting, setIsExecuting] = React.useState(false)
    const [commands, setCommands] = React.useState<Map<string, CommandDefinition>>(new Map())

    const inputRef = React.useRef<HTMLInputElement>(null)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const terminalRef = React.useRef<TerminalRef | null>(null)
    const commandsRef = React.useRef(commands)
     const historyRef = React.useRef(history)
      React.useEffect(() => {
        commandsRef.current = commands
        historyRef.current = history
      }, [commands, history])
    // 内置命令
    const builtInCommands: CommandDefinition[] = React.useMemo(
      () => [
        {
          name: "clear",
          description: "清空终端",
          execute: () => {
            setHistory([])
            return []
          },
        },
        {
          name: "help",
          description: "显示帮助信息",
          execute: (_ctx: CommandContext) => {
            const allCommands = Array.from(commandsRef.current.values())
            return [
              createTableOutput(
                ["命令", "说明"],
                allCommands.map((cmd) => [cmd.name, cmd.description || "-"])
              ),
            ]
          },
        },
        {
          name: "echo",
          description: "输出文本",
          execute: (ctx: CommandContext) => [{ type: "text" as const, content: ctx.args.join(" ") }],
        },
        {
          name: "history",
          description: "显示命令历史",
          execute: (_ctx: CommandContext) => [
            createListOutput(
              historyRef.current.map((h, i) => `${i + 1}. ${h.command}`),
              true
            ),
          ],
        },
      ],
      []
    )

    // 注册命令
    React.useEffect(() => {
      const newCommands = new Map<string, CommandDefinition>()

      // 注册内置命令
      builtInCommands.forEach((cmd) => newCommands.set(cmd.name, cmd))

      // 注册初始自定义命令
      initialCommands.forEach((cmd) => newCommands.set(cmd.name, cmd))

      setCommands(newCommands)
    }, [initialCommands, builtInCommands])

    // Terminal API
    const terminalAPI: TerminalRef = React.useMemo(
      () => ({
        print: (output: OutputItem | OutputItem[]) => {
          const outputs = Array.isArray(output) ? output : [output]
          setHistory((prev) => {
            const newHistory = [...prev]
            if (newHistory.length > 0) {
              newHistory[newHistory.length - 1].outputs.push(...outputs)
            } else {
              newHistory.push({
                command: "",
                outputs,
                timestamp: new Date(),
              })
            }
            return newHistory
          })
        },
        clear: () => setHistory([]),
        execute: async (command: string) => {
          await executeCommand(command)
        },
        registerCommand: (cmd: CommandDefinition) => {
          setCommands((prev) => new Map(prev).set(cmd.name, cmd))
        },
        unregisterCommand: (name: string) => {
          setCommands((prev) => {
            const newMap = new Map(prev)
            newMap.delete(name)
            return newMap
          })
        },
        getHistory: () => history,
      }),
      [history]
    )

    terminalRef.current = terminalAPI

    React.useImperativeHandle(ref, () => terminalAPI, [terminalAPI])

    // 执行单个命令
    const executeSingleCommand = async (
      input: string,
      pipeInput?: OutputItem[]
    ): Promise<OutputItem[]> => {
      const { name, args, flags } = parseCommand(input)

      if (!name) return []

      const ctx: CommandContext = {
        args,
        rawInput: input,
        flags,
        pipeInput,
        terminal: terminalAPI,
      }

      const cmd = commands.get(name)

      if (cmd) {
        try {
          const result = await cmd.execute(ctx)
          return result
        } catch (err) {
          return [{ type: "error", content: `命令执行错误: ${err}` }]
        }
      }

      // 尝试远程执行
      if (remoteExecutor) {
        try {
          return await remoteExecutor(input, ctx)
        } catch (err) {
          return [{ type: "error", content: `远程执行错误: ${err}` }]
        }
      }

      return [{ type: "error", content: `未知命令: ${name}` }]
    }

    // 处理管道和分号
    const executeCommand = async (fullInput: string) => {
      if (!fullInput.trim()) return

      setIsExecuting(true)
      onCommandExecute?.(fullInput)

      // 添加历史记录（带 loading 状态）
      const entry: HistoryEntry = {
        command: fullInput,
        outputs: [{ type: "loading", content: "执行中..." }],
        timestamp: new Date(),
      }
      setHistory((prev) => [...prev, entry])

      try {
        // 按分号分割多个命令
        const commandGroups = splitByOperator(fullInput, ";")
        const allOutputs: OutputItem[] = []

        for (const group of commandGroups) {
          // 按管道符分割
          const pipelineCommands = splitByOperator(group, "|")
          let pipeOutput: OutputItem[] | undefined

          for (const cmd of pipelineCommands) {
            const trimmedCmd = cmd.trim()

            // 处理 > 输出重定向（简单实现：打印到控制台）
            if (trimmedCmd.includes(">")) {
              const [actualCmd] = splitByOperator(trimmedCmd, ">")
              pipeOutput = await executeSingleCommand(actualCmd.trim(), pipeOutput)
              // 这里可以扩展实现文件保存等功能
            } else {
              pipeOutput = await executeSingleCommand(trimmedCmd, pipeOutput)
            }
          }

          if (pipeOutput) {
            allOutputs.push(...pipeOutput)
          }
        }

        // 更新历史记录，移除 loading 状态
        setHistory((prev) => {
          const newHistory = [...prev]
          const lastEntry = newHistory[newHistory.length - 1]
          if (lastEntry) {
            lastEntry.outputs = allOutputs
          }
          return newHistory
        })
      } catch (err) {
        setHistory((prev) => {
          const newHistory = [...prev]
          const lastEntry = newHistory[newHistory.length - 1]
          if (lastEntry) {
            lastEntry.outputs = [{ type: "error", content: `执行错误: ${err}` }]
          }
          return newHistory
        })
      }

      setIsExecuting(false)
      setHistoryIndex(-1)
    }

    // 处理输入
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isExecuting) {
        executeCommand(inputValue)
        setInputValue("")
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const commandHistory = history.filter((h) => h.command)
        if (commandHistory.length > 0) {
          const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
          setHistoryIndex(newIndex)
          setInputValue(commandHistory[commandHistory.length - 1 - newIndex]?.command || "")
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        if (historyIndex > 0) {
          const commandHistory = history.filter((h) => h.command)
          const newIndex = historyIndex - 1
          setHistoryIndex(newIndex)
          setInputValue(commandHistory[commandHistory.length - 1 - newIndex]?.command || "")
        } else {
          setHistoryIndex(-1)
          setInputValue("")
        }
      } else if (e.key === "c" && e.ctrlKey) {
        if (isExecuting) {
          setIsExecuting(false)
          setHistory((prev) => {
            const newHistory = [...prev]
            const lastEntry = newHistory[newHistory.length - 1]
            if (lastEntry && lastEntry.outputs.some((o) => o.type === "loading")) {
              lastEntry.outputs = [{ type: "text", content: "^C" }]
            }
            return newHistory
          })
        } else {
          setInputValue("")
        }
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault()
        setHistory([])
      }
    }

    // 自动滚动到底部
    const scrollToBottom = React.useCallback(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, [])

    // 监听 history 变化，自动滚动
    React.useEffect(() => {
      scrollToBottom()
    }, [history, scrollToBottom])

    // 执行完成后聚焦输入框
    React.useEffect(() => {
      if (!isExecuting) {
        // 使用 setTimeout 确保 DOM 更新完成后再聚焦
        setTimeout(() => {
          inputRef.current?.focus()
          scrollToBottom()
        }, 0)
      }
    }, [isExecuting, scrollToBottom])

    // 聚焦输入框
    const handleContainerClick = () => {
      inputRef.current?.focus()
    }

    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-y-auto rounded-lg border border-border bg-background font-mono text-sm",
          className
        )}
        style={{maxHeight:"500px",height:"auto"}}
        onClick={handleContainerClick}
      >
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <span className="ml-2 text-xs text-muted-foreground">CCRS Terminal</span>
        </div>

        {/* 终端内容区域 - 固定高度，内部滚动 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4" style={{ minHeight: 0 }}>
          {/* 欢迎信息 */}
          {welcomeMessage && history.length === 0 && (
            <div className="mb-4 text-muted-foreground">{welcomeMessage}</div>
          )}

          {/* 历史记录 */}
          {history.map((entry, i) => (
            <div key={i} className="mb-2">
              {entry.command && (
                <div className="flex items-center gap-2">
                  <span>{prompt}</span>
                  <span>{entry.command}</span>
                </div>
              )}
              <div className="ml-0 mt-1">
                {entry.outputs.map((output, j) => (
                  <RenderOutput key={j} item={output} />
                ))}
              </div>
            </div>
          ))}

          {/* 输入行 */}
          <div className="flex items-center gap-2">
            <span>{prompt}</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              className="flex-1 bg-transparent outline-none disabled:opacity-50"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            {isExecuting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </div>
    )
  }
)

CCRSTerminal.displayName = "CCRS Terminal"

// ============== 导出工具函数 ==============

export function createTableOutput(
  headers: string[],
  rows: (string | number)[][]
): OutputItem {
  return { type: "table", content: { headers, rows } }
}

export function createListOutput(
  items: (string | React.ReactNode)[],
  ordered = false
): OutputItem {
  return { type: "list", content: { items, ordered } }
}

export function createTextOutput(text: string, className?: string): OutputItem {
  return { type: "text", content: text, className }
}

export function createErrorOutput(message: string): OutputItem {
  return { type: "error", content: message }
}

export function createHtmlOutput(html: string, className?: string): OutputItem {
  return { type: "html", content: html, className }
}

export function createComponentOutput(
  component: React.ReactNode,
  className?: string
): OutputItem {
  return { type: "component", content: component, className }
}

export function createLoadingOutput(message?: string): OutputItem {
  return { type: "loading", content: message || "加载中..." }
}
