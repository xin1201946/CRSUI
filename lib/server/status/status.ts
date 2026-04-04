type TrendPoint<T> = [T]

type UnknownRecord = Record<string, unknown>

interface ServerStatusPayload {
  Usercount: number
  cpu: {
    count: number
    name: string
    percent: number
  }
  memory: {
    percent: number
    total: number
  }
  current_time: string
  external_ip: string
  gpus: unknown[] | UnknownRecord | null
  python: UnknownRecord | null
  network: unknown[] | UnknownRecord | null
  hostname: string
  info: string
  os: {
    platform: string
    release: string
    version: string
  }
  swap: {
    total: number
    percent: number
  }
  uptime: string
}

interface ServerStatusState {
  currentTime: TrendPoint<string>[]
  userCount: number
  cpuCount: number
  cpuName: string
  cpuPercent: TrendPoint<number>[]
  memPercent: TrendPoint<number>[]
  memTotal: number
  externalIp: string
  gpu: unknown[] | UnknownRecord | null
  hostname: string
  serverInfo: string
  platform: string
  swapTotal: number
  swapPercent: number
  runTime: string
  network: unknown[] | UnknownRecord | null
  python: UnknownRecord | null
}

interface ServerInfoSnapshot {
  python: UnknownRecord
  currentTime: TrendPoint<string>[]
  userCount: number
  cpu_name: string
  cpuCount: number
  cpuPercent: TrendPoint<number>[]
  memPercent: TrendPoint<number>[]
  memTotal: number
  externalIp: string
  gpu: unknown[] | UnknownRecord | null
  network: unknown[] | UnknownRecord
  hostname: string
  serverInfo: string
  platform: string
  swapTotal: number
  swapPercent: number
  runTime: string
}

const HISTORY_LIMIT = 10

const state: ServerStatusState = {
  currentTime: [],
  userCount: 0,
  cpuCount: 0,
  cpuName: "",
  cpuPercent: [],
  memPercent: [],
  memTotal: 0,
  externalIp: "",
  gpu: null,
  hostname: "",
  serverInfo: "",
  platform: "",
  swapTotal: 0,
  swapPercent: 0,
  runTime: "",
  network: null,
  python: null,
}

function pushHistory<T>(target: TrendPoint<T>[], value: T): void {
  if (target.length > HISTORY_LIMIT) {
    target.shift()
  }
  target.push([value])
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value]
  }
  if (value && typeof value === "object") {
    return { ...(value as UnknownRecord) }
  }
  return value
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object"
}

function isServerStatusPayload(data: unknown): data is ServerStatusPayload {
  if (!isRecord(data)) {
    return false
  }

  return (
    typeof data.Usercount === "number" &&
    isRecord(data.cpu) &&
    typeof data.cpu.count === "number" &&
    typeof data.cpu.name === "string" &&
    typeof data.cpu.percent === "number" &&
    isRecord(data.memory) &&
    typeof data.memory.percent === "number" &&
    typeof data.memory.total === "number" &&
    typeof data.current_time === "string" &&
    typeof data.external_ip === "string" &&
    typeof data.hostname === "string" &&
    typeof data.info === "string" &&
    isRecord(data.os) &&
    typeof data.os.platform === "string" &&
    typeof data.os.release === "string" &&
    typeof data.os.version === "string" &&
    isRecord(data.swap) &&
    typeof data.swap.total === "number" &&
    typeof data.swap.percent === "number" &&
    typeof data.uptime === "string"
  )
}

export function set_server_info(data: unknown): void {
  if (!isServerStatusPayload(data)) {
    return
  }

  state.userCount = data.Usercount
  state.cpuCount = data.cpu.count
  state.cpuName = data.cpu.name

  pushHistory(state.cpuPercent, data.cpu.percent)
  pushHistory(state.memPercent, data.memory.percent)
  pushHistory(state.currentTime, data.current_time)

  state.memTotal = data.memory.total
  state.externalIp = data.external_ip
  state.gpu = data.gpus
  state.python = data.python
  state.network = data.network
  state.hostname = data.hostname
  state.serverInfo = data.info
  state.platform = `${data.os.platform}${data.os.release}/${data.os.version}`
  state.swapTotal = data.swap.total
  state.swapPercent = data.swap.percent
  state.runTime = data.uptime

}

export default function getServerInfoSnapshot(): ServerInfoSnapshot {
  return {
    python: state.python
      ? ({ ...state.python } as UnknownRecord)
      : {
          version: "Unknown",
          released: "",
          RepairNumber: "",
        },
    currentTime: [...state.currentTime],
    userCount: state.userCount,
    cpu_name: state.cpuName || "Unknown",
    cpuCount: state.cpuCount,
    cpuPercent: [...state.cpuPercent],
    memPercent: [...state.memPercent],
    memTotal: state.memTotal,
    externalIp: state.externalIp,
    gpu: (cloneUnknown(state.gpu) as unknown[] | UnknownRecord | null) ?? null,
    network: (cloneUnknown(state.network) as unknown[] | UnknownRecord) ?? [],
    hostname: state.hostname,
    serverInfo: state.serverInfo,
    platform: state.platform,
    swapTotal: state.swapTotal,
    swapPercent: state.swapPercent,
    runTime: state.runTime,
  }
}
