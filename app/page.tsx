"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import utils from "@/lib/utils"

type ServerSnapshot = ReturnType<typeof utils.Server.get.serverStatus>
type UnknownRecord = Record<string, unknown>

type NetworkSpeed = {
  download_speedKBps?: string
  upload_speedKBps?: string
  total_speedKBps?: string
  utilization?: string
}

type NetworkAdapter = {
  name: string
  bytesRecv: number
  bytesSent: number
  packetsRecv: number
  packetsSent: number
  ipv4: string
  ipv6: string
  isUp: boolean
  speedRaw: number | NetworkSpeed
}

type TimelinePoint = {
  time: number
  cpu: number
  memory: number
  swap: number
}

type DashboardState = {
  snapshot: ServerSnapshot
  samples: TimelinePoint[]
}

const REFRESH_INTERVAL = 2000
const MAX_SAMPLES = 18

const trendConfig = {
  cpu: {
    label: "CPU",
    color: "#3B82F6",
  },
  memory: {
    label: "Memory",
    color: "#F59E0B",
  },
  swap: {
    label: "SWAP",
    color: "#22C55E",
  },
} satisfies ChartConfig

function getLastNumber(history: Array<[number]>, fallback = 0) {
  const last = history[history.length - 1]
  return typeof last?.[0] === "number" ? last[0] : fallback
}

function getLastString(history: Array<[string]>, fallback = "") {
  const last = history[history.length - 1]
  return typeof last?.[0] === "string" ? last[0] : fallback
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max)
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatDecimal(value: number) {
  return value.toFixed(1)
}

function formatCapacity(value: number, unit: string) {
  return `${formatDecimal(value)} ${unit}`
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getFirstRecord(value: unknown): UnknownRecord | null {
  if (Array.isArray(value)) {
    const found = value.find((item) => isRecord(item))
    return found ?? null
  }
  if (isRecord(value)) {
    return value
  }
  return null
}

function toEntries(record: UnknownRecord | null, maxCount = 6) {
  if (!record) {
    return [] as Array<[string, unknown]>
  }
  return Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, maxCount)
}

function formatUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (value == null) {
    return "-"
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B"
  }
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

function toNetworkAdapters(value: unknown): NetworkAdapter[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item) => isRecord(item))
    .map((item) => {
      const speedValue = item.speed
      const speedRaw: number | NetworkSpeed = isRecord(speedValue)
        ? {
            download_speedKBps:
              typeof speedValue.download_speedKBps === "string"
                ? speedValue.download_speedKBps
                : undefined,
            upload_speedKBps:
              typeof speedValue.upload_speedKBps === "string"
                ? speedValue.upload_speedKBps
                : undefined,
            total_speedKBps:
              typeof speedValue.total_speedKBps === "string"
                ? speedValue.total_speedKBps
                : undefined,
            utilization:
              typeof speedValue.utilization === "string"
                ? speedValue.utilization
                : undefined,
          }
        : typeof speedValue === "number"
          ? speedValue
          : 0

      return {
        name: typeof item.name === "string" ? item.name : "Unknown",
        bytesRecv: toNumber(item.bytes_recv),
        bytesSent: toNumber(item.bytes_sent),
        packetsRecv: toNumber(item.packets_recv),
        packetsSent: toNumber(item.packets_sent),
        ipv4: typeof item.ipv4 === "string" ? item.ipv4 : "-",
        ipv6: typeof item.ipv6 === "string" ? item.ipv6 : "-",
        isUp: Boolean(item.is_up),
        speedRaw,
      }
    })
}

function extractUsage(record: UnknownRecord | null, fallback = 0): number {
  if (!record) {
    return fallback
  }
  const keyPattern = /(percent|usage|util|load|rate|利用率|负载)/i
  for (const [key, value] of Object.entries(record)) {
    if (!keyPattern.test(key)) {
      continue
    }
    if (typeof value === "number") {
      return clamp(value)
    }
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace("%", ""))
      if (!Number.isNaN(parsed)) {
        return clamp(parsed)
      }
    }
  }
  return fallback
}

function buildInitialSamples(snapshot: ServerSnapshot): TimelinePoint[] {
  const cpuHistory = snapshot.cpuPercent.map((item) => clamp(item[0]))
  const memoryHistory = snapshot.memPercent.map((item) => clamp(item[0]))
  const length = Math.max(cpuHistory.length, memoryHistory.length, 1)
  const now = Date.now()

  return Array.from({ length }, (_, index) => ({
    time: now - (length - index - 1) * REFRESH_INTERVAL,
    cpu: cpuHistory[index] ?? cpuHistory[cpuHistory.length - 1] ?? 0,
    memory: memoryHistory[index] ?? memoryHistory[memoryHistory.length - 1] ?? 0,
    swap: clamp(snapshot.swapPercent),
  }))
}

function createSample(snapshot: ServerSnapshot): TimelinePoint {
  return {
    time: Date.now(),
    cpu: clamp(getLastNumber(snapshot.cpuPercent)),
    memory: clamp(getLastNumber(snapshot.memPercent)),
    swap: clamp(snapshot.swapPercent),
  }
}

function buildDashboardState(): DashboardState {
  const snapshot = utils.Server.get.serverStatus()
  return {
    snapshot,
    samples: buildInitialSamples(snapshot),
  }
}

function severityBadgeClass(value: number): string {
  if (value >= 85) {
    return "border-red-200 bg-red-500/10 text-red-700"
  }
  if (value <= 35) {
    return "border-green-200 bg-green-500/10 text-green-700"
  }
  return "border-amber-200 bg-amber-500/10 text-amber-700"
}

function InfoCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  )
}

function MiniTrend({
  data,
  dataKey,
  color,
}: {
  data: TimelinePoint[]
  dataKey: "cpu" | "memory"
  color: string
}) {
  const chartConfig = {
    [dataKey]: {
      label: dataKey.toUpperCase(),
      color,
    },
  } satisfies ChartConfig
  const gradientId = `${dataKey}-mini-gradient`

  return (
    <ChartContainer config={chartConfig} className="h-16 w-full">
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <Area
          dataKey={dataKey}
          type="monotone"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          fillOpacity={1}
          dot={false}
          isAnimationActive={true}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function MetricPanel({
  title,
  subtitle,
  percent,
  trendData,
  trendKey,
  color,
  usageLabel,
  bottomItems,
}: {
  title: string
  subtitle: string
  percent: number
  trendData: TimelinePoint[]
  trendKey: "cpu" | "memory"
  color: string
  usageLabel: string
  bottomItems: string[]
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <div className="space-y-1">
          <CardTitle className="text-[30px] leading-none font-semibold">
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {subtitle}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <MiniTrend data={trendData} dataKey={trendKey} color={color} />
            <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">
              {usageLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-6xl leading-none font-bold tracking-tight text-foreground transition-all duration-300">
              {formatPercent(percent)}
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${severityBadgeClass(percent)}`}
            >
              Live
            </Badge>
          </div>
        </div>

        <div
          className="grid divide-x rounded-md border bg-muted/30 text-center"
          style={{
            gridTemplateColumns: `repeat(${bottomItems.length}, minmax(0, 1fr))`,
          }}
        >
          {bottomItems.map((item) => (
            <div
              key={item}
              className="min-w-0 px-2 py-2 text-sm font-medium whitespace-nowrap"
            >
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TrendChart({ data }: { data: TimelinePoint[] }) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-semibold"></CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendConfig} className="h-68 w-full">
          <AreaChart
            data={data}
            margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="swapGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.22)" />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={formatTimestamp}
            />
            <YAxis
              domain={[0, 100]}
              width={42}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatTimestamp(Number(value))}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} className="pt-4" />

            <Area
              type="monotone"
              dataKey="cpu"
              stroke="var(--color-cpu)"
              strokeWidth={1.5}
              fill="url(#cpuGradient)"
              dot={false}
              isAnimationActive={true}
            />
            <Area
              type="monotone"
              dataKey="memory"
              stroke="var(--color-memory)"
              strokeWidth={1.5}
              fill="url(#memoryGradient)"
              dot={false}
              isAnimationActive={true}
            />
            <Area
              type="monotone"
              dataKey="swap"
              stroke="var(--color-swap)"
              strokeWidth={1.5}
              fill="url(#swapGradient)"
              dot={false}
              isAnimationActive={true}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const [dashboard, setDashboard] = useState<DashboardState>(buildDashboardState)
  const [selectedNetworkName, setSelectedNetworkName] = useState<string>("")

  useEffect(() => {
    const refresh = () => {
      const nextSnapshot = utils.Server.get.serverStatus()
      setDashboard((prev) => ({
        snapshot: nextSnapshot,
        samples: [...prev.samples, createSample(nextSnapshot)].slice(-MAX_SAMPLES),
      }))
    }

    const timer = window.setInterval(refresh, REFRESH_INTERVAL)
    return () => window.clearInterval(timer)
  }, [])

  const metrics = useMemo(() => {
    const snapshot = dashboard.snapshot
    const cpuPercent = clamp(getLastNumber(snapshot.cpuPercent))
    const memoryPercent = clamp(getLastNumber(snapshot.memPercent))
    const cpuTotal = Math.max(snapshot.cpuCount, 0)
    const memoryTotal = Math.max(snapshot.memTotal, 0)
    const memoryUsed = (memoryTotal * memoryPercent) / 100

    const gpuRecord = getFirstRecord(snapshot.gpu)
    const pythonRecord = getFirstRecord(snapshot.python)
    const networkAdapters = toNetworkAdapters(snapshot.network)

    const gpuUsage = extractUsage(gpuRecord, 0)
    const gpuCount = Array.isArray(snapshot.gpu) ? snapshot.gpu.length : gpuRecord ? 1 : 0
    const networkCount = networkAdapters.length

    return {
      cpuPercent,
      memoryPercent,
      cpuTotal,
      memoryTotal,
      memoryUsed,
      swapPercent: clamp(snapshot.swapPercent),
      swapTotal: Math.max(snapshot.swapTotal, 0),
      cpuName: snapshot.cpu_name || "Unknown CPU",
      hostname: snapshot.hostname || "Unknown Host",
      platform: snapshot.platform || "Unknown Platform",
      runtime: snapshot.runTime || "--",
      serverInfo: snapshot.serverInfo || "-",
      userCount: snapshot.userCount,
      externalIp: snapshot.externalIp || "0.0.0.0",
      lastUpdate: getLastString(snapshot.currentTime, "syncing"),
      gpuCount,
      networkCount,
      networkAdapters,
      gpuUsage,
      pythonEntries: toEntries(pythonRecord, 5),
      gpuEntries: toEntries(gpuRecord, 7),
    }
  }, [dashboard])

  const activeNetworkName = useMemo(
    () =>
      metrics.networkAdapters.find((adapter) => adapter.isUp)?.name ??
      metrics.networkAdapters[0]?.name ??
      "",
    [metrics.networkAdapters]
  )

  const selectedNetwork = useMemo(
    () =>
      metrics.networkAdapters.find((adapter) => adapter.name === selectedNetworkName) ??
      metrics.networkAdapters.find((adapter) => adapter.name === activeNetworkName) ??
      null,
    [metrics.networkAdapters, selectedNetworkName, activeNetworkName]
  )

  const currentNetworkName = selectedNetwork?.name ?? activeNetworkName

  return (
    <div id="homePage" className="mx-auto w-full bg-muted/20 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-4xl leading-none font-semibold tracking-tight text-foreground">
          服务器运行状态
        </h1>
        <Badge
          variant="outline"
          className="border-border text-muted-foreground"
        >
          更新: {metrics.lastUpdate}
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <MetricPanel
              title="处理器"
              subtitle={metrics.cpuName}
              percent={metrics.cpuPercent}
              trendData={dashboard.samples}
              trendKey="cpu"
              color="#3B82F6"
              usageLabel="Processor usage"
              bottomItems={[
                `${metrics.cpuTotal} Cores`,
                `${metrics.gpuCount} Devices`,
                `${metrics.userCount} Users`,
              ]}
            />
            <MetricPanel
              title="内存"
              subtitle={metrics.platform}
              percent={metrics.memoryPercent}
              trendData={dashboard.samples}
              trendKey="memory"
              color="#F59E0B"
              usageLabel="Memory usage"
              bottomItems={[
                formatCapacity(metrics.memoryTotal / 1024, "GiB RAM"),
                formatCapacity(metrics.swapTotal / 1024, "GiB Swap"),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoCard title="交换内存">
              <div className="flex items-center gap-4">
                <ChartContainer
                  config={{
                    swap: {
                      label: "Swap",
                      color: "#22C55E",
                    },
                  }}
                  className="h-26 w-26"
                >
                  <RadialBarChart
                    data={[{ swap: metrics.swapPercent }]}
                    innerRadius="68%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis
                      type="number"
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    <RadialBar
                      dataKey="swap"
                      fill="#22C55E"
                      background={{ fill: "rgba(148,163,184,0.16)" }}
                      cornerRadius={999}
                    />
                  </RadialBarChart>
                </ChartContainer>
                <div>
                  <p className="text-3xl font-bold">
                    {formatPercent(metrics.swapPercent)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCapacity(metrics.swapTotal/1024, "GiB total")}
                  </p>
                </div>
              </div>
            </InfoCard>

            <InfoCard title="Python">
              <div className="space-y-2">
                {metrics.pythonEntries.length > 0 ? (
                  metrics.pythonEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">
                        {formatUnknown(value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No python details</p>
                )}
              </div>
            </InfoCard>

            <InfoCard title="网络">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">网卡数量: {metrics.networkCount}</p>

                {metrics.networkAdapters.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {metrics.networkAdapters.map((adapter) => (
                        <button
                          key={adapter.name}
                          type="button"
                          className={`rounded border px-2 py-1 text-xs transition-colors ${
                            currentNetworkName === adapter.name
                              ? "border-blue-300 bg-blue-500/10 text-blue-700"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }`}
                          onClick={() => setSelectedNetworkName(adapter.name)}
                        >
                          {adapter.name}
                        </button>
                      ))}
                    </div>

                    {selectedNetwork ? (
                      <>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground">名称</span>
                          <span className="font-medium">{selectedNetwork.name}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground">状态</span>
                          <span className="font-medium">{selectedNetwork.isUp ? "在线" : "离线"}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground">IPv4</span>
                          <span className="font-medium">{selectedNetwork.ipv4}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground">IPv6</span>
                          <span className="font-medium">{selectedNetwork.ipv6}</span>
                        </div>

                        {typeof selectedNetwork.speedRaw === "number" ? (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-muted-foreground">链路速度</span>
                            <span className="font-medium">{selectedNetwork.speedRaw}</span>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-muted-foreground">下载速率</span>
                              <span className="font-medium">
                                {selectedNetwork.speedRaw.download_speedKBps ?? "0.00"} KB/s
                              </span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-muted-foreground">上传速率</span>
                              <span className="font-medium">
                                {selectedNetwork.speedRaw.upload_speedKBps ?? "0.00"} KB/s
                              </span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-muted-foreground">总速率</span>
                              <span className="font-medium">
                                {selectedNetwork.speedRaw.total_speedKBps ?? "0.00"} KB/s
                              </span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-muted-foreground">利用率</span>
                              <span className="font-medium">
                                {selectedNetwork.speedRaw.utilization ?? "0.0"}%
                              </span>
                            </div>
                          </>
                        )}

                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground">接收流量</span>
                          <span className="font-medium">{formatBytes(selectedNetwork.bytesRecv)}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground">发送流量</span>
                          <span className="font-medium">{formatBytes(selectedNetwork.bytesSent)}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground">接收包</span>
                          <span className="font-medium">{selectedNetwork.packetsRecv}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground">发送包</span>
                          <span className="font-medium">{selectedNetwork.packetsSent}</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground">无网络连接</p>
                )}
              </div>
            </InfoCard>

            <InfoCard title="GPU">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={severityBadgeClass(metrics.gpuUsage)}
                  >
                    Usage {formatPercent(metrics.gpuUsage)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {metrics.gpuCount} device(s)
                  </span>
                </div>
                {metrics.gpuEntries.length > 0 ? (
                  metrics.gpuEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">
                        {formatUnknown(value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No GPU details</p>
                )}
              </div>
            </InfoCard>
          </div>

          <TrendChart data={dashboard.samples} />
        </div>

        <Card className="h-fit border-border bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-semibold">服务器信息</CardTitle>
            <CardDescription>Compact status panel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["系统版本", metrics.platform],
              ["电脑名称", metrics.hostname],
              ["服务器IP", metrics.externalIp],
              ["已连接设备", String(metrics.userCount)],
              ["CPU核心数", String(metrics.cpuTotal)],
              ["总内存", formatCapacity(metrics.memoryTotal / 1024, "GiB")],
              ["Swap总计", formatCapacity(metrics.swapTotal / 1024, "GiB")],
              ["服务器运行时长", metrics.runtime],
              ["服务器状态", metrics.serverInfo],
            ].map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-[96px_1fr] gap-2 border-b py-1.5 text-left last:border-b-0"
              >
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
