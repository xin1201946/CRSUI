"use client"
import styles from "./reg.module.css"
import { UploadBox } from "@/components/upload-box"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSiteHeader } from "@/components/site-header-context"
import utils from "@/lib/utils"

type HistoryRow = {
  hubId: string
  recognitionTime: string
  moldNumber: string
}

type HistoryKey = keyof HistoryRow
type OCRTaskStatus = "idle" | "waiting" | "processing" | "completed" | "failed"
const OCR_POLL_TIMEOUT_MS = 90_000

const HISTORY_HEADER_MAP: Record<string, HistoryKey> = {
  hub_id: "hubId",
  recognition_time: "recognitionTime",
  mold_number: "moldNumber",
}

const HISTORY_LABELS: Record<HistoryKey, string> = {
  hubId: "Hub_id",
  recognitionTime: "recognition_time",
  moldNumber: "mold_number",
}

function normalizeHistory(raw: unknown): HistoryRow[] {
  if (!Array.isArray(raw) || raw.length < 2) {
    return []
  }

  const [headerRow, ...records] = raw
  if (!Array.isArray(headerRow)) {
    return []
  }

  const mappedHeaders = headerRow.map((header) => {
    const key = String(header).trim().toLowerCase()
    return HISTORY_HEADER_MAP[key] ?? null
  })

  return records
    .filter((item): item is unknown[] => Array.isArray(item))
    .map((item) => {
      const row: HistoryRow = {
        hubId: "",
        recognitionTime: "",
        moldNumber: "",
      }

      mappedHeaders.forEach((mappedKey, index) => {
        if (!mappedKey) {
          return
        }
        row[mappedKey] = String(item[index] ?? "")
      })

      return row
    })
    .filter((row) => row.hubId || row.recognitionTime || row.moldNumber)
}

function extractHistoryRows(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!payload || typeof payload !== "object") {
    return []
  }

  const source = payload as {
    result?: unknown
    response?: {
      result?: unknown
    } | unknown
  }

  if (Array.isArray(source.result)) {
    return source.result
  }

  if (Array.isArray(source.response)) {
    return source.response
  }

  if (
    source.response &&
    typeof source.response === "object" &&
    "result" in source.response
  ) {
    return (source.response as { result?: unknown }).result ?? []
  }

  return []
}

function parseTaskProgress(payload: unknown): {
  status: Exclude<OCRTaskStatus, "idle"> | null
  text: string | null
} {
  if (!payload || typeof payload !== "object") {
    return { status: null, text: null }
  }

  const source = payload as {
    status?: unknown
    text?: unknown
  }

  let statusValue: unknown = source.status
  let textValue: unknown = source.text

  if (source.status && typeof source.status === "object") {
    const nested = source.status as {
      status?: unknown
      text?: unknown
    }
    statusValue = nested.status
    textValue = nested.text ?? source.text
  }

  if (
    statusValue === "waiting" ||
    statusValue === "processing" ||
    statusValue === "completed" ||
    statusValue === "failed"
  ) {
    return {
      status: statusValue,
      text: typeof textValue === "string" ? textValue : null,
    }
  }

  return { status: null, text: null }
}

function OCRComponse(){
  const [uploadState, setUploadState] = useState(true)
  const [taskID, setTaskID] = useState<string>()
  const [taskStatus, setTaskStatus] = useState<OCRTaskStatus>("idle")
  const [ocrText, setOcrText] = useState<string | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const activeTaskRef = useRef<string | null>(null)
  const taskDeadlineRef = useRef<number>(0)
  const successNotifiedTaskRef = useRef<string | null>(null)

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  function pollTaskStatus(taskUuid: string, delay = 500) {
    clearPolling()

    pollTimerRef.current = window.setTimeout(async () => {
      try {
        if (Date.now() > taskDeadlineRef.current) {
          setTaskStatus("failed")
          activeTaskRef.current = null
          clearPolling()
          utils.logs.add("front_ocr", "warning", `OCR任务超时：${taskUuid}`)
          return
        }

        const res = await utils.Server.apis.ocr.getStatus.byTask(taskUuid)
        if (activeTaskRef.current !== taskUuid) {
          return
        }

        const parsed = parseTaskProgress(res?.response)
        if (!parsed.status) {
          setTaskStatus("failed")
          clearPolling()
          return
        }

        setTaskStatus(parsed.status)

        if (parsed.status === "completed") {
          setOcrText(parsed.text)
          if (successNotifiedTaskRef.current !== taskUuid) {
            utils.Toast.send(
              "OCR识别完成",
              `任务 ${taskUuid} 识别结果：${parsed.text ?? "-"}`,
              "default"
            )
            successNotifiedTaskRef.current = taskUuid
          }
          activeTaskRef.current = null
          clearPolling()
          return
        }

        if (parsed.status === "failed") {
          activeTaskRef.current = null
          clearPolling()
          return
        }

        const nextDelay = parsed.status === "waiting" ? 1800 : 1000
        pollTaskStatus(taskUuid, nextDelay)
      } catch (err) {
        if (activeTaskRef.current !== taskUuid) {
          return
        }
        setTaskStatus("failed")
        activeTaskRef.current = null
        clearPolling()
        utils.logs.add("front_ocr", "error", `OCR状态轮询失败：${String(err)}`)
      }
    }, delay)
  }

  const createOCRTask = async () => {
    clearPolling()
    setOcrText(null)
    setTaskStatus("waiting")
    successNotifiedTaskRef.current = null
    taskDeadlineRef.current = Date.now() + OCR_POLL_TIMEOUT_MS

    try {
      const res = await utils.Server.apis.ocr.startOCR(
        utils.Server.uuid.init().toString()
      )
      const responseData = res?.response as { task_uuid?: unknown } | null
      const taskUuid =
        responseData && typeof responseData.task_uuid === "string"
          ? responseData.task_uuid
          : null

      if (res.status === 200 && taskUuid) {
        setTaskID(taskUuid)
        activeTaskRef.current = taskUuid
        utils.logs.add("front_ocr", "successfully", `OCR任务已创建：${taskUuid}`)
        pollTaskStatus(taskUuid, 500)
        return
      }

      setTaskStatus("failed")
      activeTaskRef.current = null
      utils.logs.add("front_ocr", "warning", `OCR任务创建失败，状态码：${res.status}`)
    } catch (err) {
      setTaskStatus("failed")
      activeTaskRef.current = null
      utils.logs.add("front_ocr", "error", `OCR任务创建失败：${String(err)}`)
    }
  }

  useEffect(() => {
    return () => {
      activeTaskRef.current = null
      successNotifiedTaskRef.current = null
      clearPolling()
    }
  }, [clearPolling])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="mx-auto w-full max-w-2xl">
        <UploadBox
          data={{
            uploadUrl: `${utils.Server.get.host()}${utils.Server.apis.ports.picture.upload}?uuid=${utils.Server.uuid.init()}`,
            allowFile: [".jpg", ".png"],
            disableUpload: false,
            prompt: "点击上传图片",
            ifSuccess: () => setUploadState(false),
          }}
        />
      </div>
      <div className="flex justify-center">
        <Button
          className="min-w-36"
          disabled={uploadState || taskStatus === "waiting" || taskStatus === "processing"}
          onClick={() => void createOCRTask()}
        >
          开始识别
        </Button>
      </div>
      <div className="space-y-1 text-center text-sm text-muted-foreground">
        {taskID ? <p>任务ID: {taskID}</p> : null}
        {taskStatus === "waiting" ? <p>任务排队中，正在等待处理...</p> : null}
        {taskStatus === "processing" ? <p>正在识别，请稍候...</p> : null}
        {taskStatus === "completed" ? (
          <p className="font-medium text-foreground">识别结果: {ocrText ?? "-"}</p>
        ) : null}
        {taskStatus === "failed" ? <p className="text-red-500">任务失败，请重试</p> : null}
      </div>
    </div>
  )
}

function HistoryDataTable({
  rows,
  isLoading,
  error,
}: {
  rows: HistoryRow[]
  isLoading: boolean
  error: string | null
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterKey, setFilterKey] = useState<"all" | HistoryKey>("all")
  const [filterValue, setFilterValue] = useState("")
  const [sortKey, setSortKey] = useState<HistoryKey>("recognitionTime")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const data = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    const filterKeyword = filterValue.trim().toLowerCase()

    const filtered = rows.filter((row) => {
      const target = [row.hubId, row.recognitionTime, row.moldNumber]
        .join(" ")
        .toLowerCase()

      if (keyword && !target.includes(keyword)) {
        return false
      }

      if (filterKey !== "all" && filterKeyword) {
        return row[filterKey].toLowerCase().includes(filterKeyword)
      }

      return true
    })

    return [...filtered].sort((a, b) => {
      const left = a[sortKey]
      const right = b[sortKey]
      let result: number

      if (sortKey === "hubId") {
        const leftNum = Number(left)
        const rightNum = Number(right)
        if (!Number.isNaN(leftNum) && !Number.isNaN(rightNum)) {
          result = leftNum - rightNum
        } else {
          result = left.localeCompare(right)
        }
      } else if (sortKey === "recognitionTime") {
        const leftTime = Date.parse(left)
        const rightTime = Date.parse(right)
        if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
          result = leftTime - rightTime
        } else {
          result = left.localeCompare(right)
        }
      } else {
        result = left.localeCompare(right)
      }

      return sortDirection === "asc" ? result : -result
    })
  }, [filterKey, filterValue, rows, searchTerm, sortDirection, sortKey])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap  gap-2 rounded-lg border bg-background/70 p-3">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="全局搜索（ID/日期/OCR结果）"
          className="w-56"
        />
        <select
          className="h-8 w-44 rounded-lg border bg-background px-2 text-sm"
          value={filterKey}
          onChange={(event) => setFilterKey(event.target.value as "all" | HistoryKey)}
        >
          <option value="all">筛选列：全部</option>
          <option value="hubId">筛选列：Hub_id</option>
          <option value="recognitionTime">筛选列：recognition_time</option>
          <option value="moldNumber">筛选列：mold_number</option>
        </select>
        <Input
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
          placeholder="列筛选关键字"
          className="w-44"
        />
      </div>

      <div className="rounded-lg border bg-background p-2">
        <Table>
          <TableHeader>
            <TableRow>
              {(["hubId", "recognitionTime", "moldNumber"] as HistoryKey[]).map((key) => (
                <TableHead key={key}>
                  <button
                    type="button"
                    className="cursor-pointer select-none"
                    onClick={() => {
                      if (sortKey === key) {
                        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                        return
                      }
                      setSortKey(key)
                      setSortDirection("asc")
                    }}
                  >
                    {HISTORY_LABELS[key]}
                    {sortKey === key ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center">
                  正在加载历史记录...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center">
                  无匹配结果
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={`${row.hubId}-${row.recognitionTime}-${index}`}>
                  <TableCell>{row.hubId || "-"}</TableCell>
                  <TableCell>{row.recognitionTime || "-"}</TableCell>
                  <TableCell>{row.moldNumber || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">共 {data.length} 条结果</p>
    </div>
  )
}

function HistoryComponse(){
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await utils.Server.apis.ocr.ocrHistory()
      const rows = extractHistoryRows(res)
      setHistory(normalizeHistory(rows))
    } catch (err) {
      console.error(err)
      setError("获取历史记录失败")
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [])


  useEffect(() => {
    void getHistory()
  }, [getHistory])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <HistoryDataTable rows={history} isLoading={isLoading} error={error} />
      <div className="flex justify-end">
        <Button
          className="min-w-36"
          onClick={() => void getHistory()}
          disabled={isLoading}
        >
          刷新历史记录
        </Button>
      </div>
    </div>
  )
}

export default function Page(){
  const [activeTab, setActiveTab] = useState<"ocr" | "history">("ocr")
  const { setTitleAfter } = useSiteHeader()

  useEffect(() => {
    setTitleAfter(
      <Tabs
        className="w-auto"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "ocr" | "history")}
      >
        <TabsList className="mx-auto">
          <TabsTrigger value="ocr">
            OCR识别
          </TabsTrigger>
          <TabsTrigger value="history">
            历史记录
          </TabsTrigger>
        </TabsList>
      </Tabs>
    )

    return () => {
      setTitleAfter(null)
    }
  }, [activeTab, setTitleAfter])

  return (
    <div className={styles.container}>
      <div className="w-full max-w-5xl">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "ocr" | "history")}
          className="w-full"
        >
        <TabsContent value="ocr" className="mt-0">
          <OCRComponse />
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <HistoryComponse />
        </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}