"use client"
import {
  ChartContainer,
  type ChartConfig,
  ChartLegendContent,
  ChartLegend,
} from "@/components/ui/chart"
import { Pie, PieChart } from "recharts"
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import utils from "@/lib/utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type LogLevel = "INFO" | "WARN" | "ERROR"
type LogFilter = "ALL" | LogLevel
const PAGE_SIZE = 5

type LogRow = {
  id: number
  time: string
  event: string
  level: LogLevel
  comment: string
}

function toLogLevel(result: unknown): LogLevel {
  if (result === "warning") {
    return "WARN"
  }
  if (result === "error") {
    return "ERROR"
  }
  return "INFO"
}

function normalizeLogs(data: unknown): LogRow[] {
  if (!Array.isArray(data)) {
    return []
  }

  return [...data]
    .map((item, index) => {
      const log = item as {
        key?: unknown
        time?: unknown
        event?: unknown
        result?: unknown
        comment?: unknown
      }
      return {
        id: typeof log.key === "number" ? log.key : index + 1,
        time: String(log.time ?? "-"),
        event: String(log.event ?? "-"),
        level: toLogLevel(log.result),
        comment: String(log.comment ?? ""),
      }
    })
    .reverse()
}

export function LogPage() {
  const [logs, setLogs] = useState<LogRow[]>(() =>
    normalizeLogs(utils.logs.get.allLogs())
  )
  const [tabValue, setTabValue] = useState("pie")
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState<LogFilter>("ALL")
  const [pageIndex, setPageIndex] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string>(() =>
    new Date().toLocaleTimeString()
  )

  const refreshLogs = useCallback(() => {
    setLogs(normalizeLogs(utils.logs.get.allLogs()))
    setUpdatedAt(new Date().toLocaleTimeString())
  }, [])

  useEffect(() => {
    refreshLogs()
    const delayedRefresh = window.setTimeout(refreshLogs, 600)
    const intervalId = window.setInterval(refreshLogs, 3000)
    return () => {
      window.clearTimeout(delayedRefresh)
      window.clearInterval(intervalId)
    }
  }, [refreshLogs])

  const handleDownloadLogs = useCallback(() => {
    utils.logs.downloadLogs()
  }, [])

  const counts = useMemo(() => {
    return logs.reduce(
      (acc, row) => {
        if (row.level === "INFO") {
          acc.info += 1
        }
        if (row.level === "WARN") {
          acc.warn += 1
        }
        if (row.level === "ERROR") {
          acc.error += 1
        }
        return acc
      },
      { info: 0, warn: 0, error: 0 }
    )
  }, [logs])

  const totalLogs = counts.info + counts.warn + counts.error

  const filteredLogs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()

    return logs.filter((row) => {
      const levelMatched = levelFilter === "ALL" || row.level === levelFilter
      if (!levelMatched) {
        return false
      }

      if (!keyword) {
        return true
      }

      return [row.time, row.event, row.comment, row.level]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    })
  }, [levelFilter, logs, searchTerm])

  useEffect(() => {
    const maxPageIndex = Math.max(Math.ceil(filteredLogs.length / PAGE_SIZE) - 1, 0)
    if (pageIndex > maxPageIndex) {
      setPageIndex(maxPageIndex)
    }
  }, [filteredLogs.length, pageIndex])

  const chartData = useMemo(
    () => [
      {
        logs: "INFO",
        count: counts.info,
        fill: "var(--color-INFO)",
      },
      {
        logs: "WARN",
        count: counts.warn,
        fill: "var(--color-WARN)",
      },
      {
        logs: "ERROR",
        count: counts.error,
        fill: "var(--color-ERROR)",
      },
    ],
    [counts.error, counts.info, counts.warn]
  )

  const chartConfig = {
    count: {
      label: "Count",
    },
    INFO: {
      label: "INFO",
      color: "#60A5FA",
    },
    WARN: {
      label: "WARN",
      color: "#FBBF24",
    },
    ERROR: {
      label: "ERROR",
      color: "#F87171",
    },
  } satisfies ChartConfig

  const columns = useMemo<ColumnDef<LogRow>[]>(
    () => [
      {
        accessorKey: "time",
        header: "时间",
      },
      {
        accessorKey: "event",
        header: "事件",
      },
      {
        accessorKey: "level",
        header: "级别",
        cell: ({ row }) => {
          const level = row.original.level
          const className =
            level === "ERROR"
              ? "bg-red-100 text-red-700"
              : level === "WARN"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-blue-100 text-blue-700"
          return (
            <Badge variant="secondary" className={className}>
              {level}
            </Badge>
          )
        },
      },
      {
        accessorKey: "comment",
        header: "备注",
        cell: ({ row }) => (
          <span className="inline-block max-w-80 truncate" title={row.original.comment}>
            {row.original.comment || "-"}
          </span>
        ),
      },
    ],
    []
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredLogs,
    columns,
    state: {
      pagination: {
        pageIndex,
        pageSize: PAGE_SIZE,
      },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize: PAGE_SIZE })
          : updater
      setPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const totalPages = Math.max(table.getPageCount(), 1)

  return (
    <div id={"setting-logs"} className={"w-full space-y-4 overflow-y-auto p-2"}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>运行日志</CardTitle>
          <p className="text-xs text-muted-foreground">
            总计 {totalLogs} 条，最近更新: {updatedAt || "--:--:--"}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Tabs
            value={tabValue}
            onValueChange={(value) => {
              setTabValue(value)
              if (value === "list") {
                refreshLogs()
              }
            }}
            className="w-full"
          >
            <TabsList className="mb-3">
              <TabsTrigger value="pie">概况</TabsTrigger>
              <TabsTrigger value="list">日志列表</TabsTrigger>
            </TabsList>
            <TabsContent value="pie">
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-62.5 pb-0 [&_.recharts-pie-label-text]:fill-foreground"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={chartData} dataKey="count" label nameKey="logs" />
                  <ChartLegend
                    content={<ChartLegendContent nameKey="logs" />}
                    className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
                  />
                </PieChart>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="list" className="mt-0 space-y-4 w-[400px]">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <Input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value)
                    setPageIndex(0)
                  }}
                  placeholder="搜索事件、备注、时间..."
                  className="w-full max-w-xs"
                />
                <Select
                  value={levelFilter}
                  onValueChange={(value: LogFilter) => {
                    setLevelFilter(value)
                    setPageIndex(0)
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="日志级别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">全部</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="WARN">WARN</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-xs">
                  共 {filteredLogs.length} 条
                </span>
              </div>

              <div className="rounded-lg border p-2">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell className="h-20 text-center" colSpan={columns.length}>
                          暂无匹配日志
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end gap-2 px-1">
                <span className="text-muted-foreground text-xs">
                  第 {pageIndex + 1} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  下一页
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={refreshLogs}>
            刷新
          </Button>
          <Button onClick={handleDownloadLogs}>下载日志</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
