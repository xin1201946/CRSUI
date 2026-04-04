import { get_Time } from "./times"
import server from "./server/host/server_host"
import storage from "./storage/storage"

// 日志数组，初始包含一条创建事件记录器的日志
// Log array, initially containing a log for creating an event recorder
let _logs = [
  {
    key: 1,
    time: get_Time(),
    event: "Create event recorder",
    result: "successfully",
    comment: "",
    color: "default",
  },
] // successfully, warning , error
// 已展示事件数组，用于避免重复展示日志
// Array of displayed events, used to avoid duplicate log display
const displayedEvents = new Set<string>()
let isFetchingServerLogs = false

function normalizeServerLogs(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (
    payload &&
    typeof payload === "object" &&
    "logs" in payload &&
    Array.isArray((payload as { logs: unknown }).logs)
  ) {
    return (payload as { logs: unknown[] }).logs
  }

  return []
}

function buildServerLogKey(timestamp, event, result, remark) {
  return `${String(timestamp)}|${String(event)}|${String(result)}|${String(remark)}`
}

/**
 * 添加本地日志记录。
 * Add a local log record.
 * @param {string} event - 日志事件名称。
 * @param {string} event - The name of the log event.
 * @param {string} [result='Null'] - 事件结果，默认为 'Null'。
 * @param {string} [result='Null'] - The result of the event, default is 'Null'.
 * @param {string} [Comment=''] - 事件备注，默认为空字符串。
 * @param {string} [Comment=''] - The remarks of the event, default is an empty string.
 */
function add_log(event, result = "Null", Comment = "") {
  // 确保 _logs 是数组
  // Ensure that _logs is an array
  if (!Array.isArray(_logs)) {
    _logs = []
  }
  // 创建新的日志对象
  // Create a new log object
  const newLog = {
    key: _logs.length + 1,
    time: get_Time(),
    event: event.toLowerCase(),
    result: result,
    comment: Comment,
    // 根据结果设置日志颜色
    // Set the log color according to the result
    color:
      result === "successfully"
        ? "green"
        : result === "warning"
          ? "yellow"
          : "red",
  }
  // 将新日志添加到 _logs 数组
  // Add the new log to the _logs array
  _logs.push(newLog)
}

/**
 * 添加服务器日志记录。
 * Add a server log record.
 * @param {string} timestamp - 日志时间戳。
 * @param {string} timestamp - The timestamp of the log.
 * @param {string} event - 日志事件名称。
 * @param {string} event - The name of the log event.
 * @param {string} [result='Null'] - 事件结果，默认为 'Null'。
 * @param {string} [result='Null'] - The result of the event, default is 'Null'.
 * @param {string} [remark=''] - 事件备注，默认为空字符串。
 * @param {string} [remark=''] - The remarks of the event, default is an empty string.
 */
function add_Server_log(timestamp, event, result = "Null", remark = "") {
  // 确保 _logs 是数组
  // Ensure that _logs is an array
  if (!Array.isArray(_logs)) {
    _logs = []
  }
  // 创建新的日志对象
  // Create a new log object
  const newLog = {
    key: _logs.length + 1,
    time: timestamp,
    event: event,
    result: result,
    comment: remark,
    // 根据结果设置日志颜色
    // Set the log color according to the result
    color:
      result === "successfully"
        ? "green"
        : result === "warning"
          ? "yellow"
          : "red",
  }
  // 将新日志添加到 _logs 数组
  // Add the new log to the _logs array
  _logs.push(newLog)
}

/**
 * 清空日志记录。
 * Clear all log records.
 */
function clear_log() {
  // 清空 _logs 数组
  // Clear the _logs array
  _logs.length = 0
  displayedEvents.clear()
  // 添加一条清空所有日志的成功记录
  // Add a successful record of clearing all _logs
  add_Server_log(get_Time(), "Clear_ALL_Logs", "successfully")
}

/**
 * 从服务器获取日志记录。
 * Get log records from the server.
 */
function get_server_logs() {
  if (isFetchingServerLogs) {
    return
  }

  const host = server.get()
  if (!host) {
    add_log("Get Server Logs Error", "error", "Server host is not configured")
    return
  }

  isFetchingServerLogs = true

  // 发送请求获取服务器日志
  // Send a request to get server _logs
  fetch(host + "/getlogs")
    // 解析响应为 JSON 数据
    // Parse the response as JSON data
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`)
      }
      return res.json()
    })
    .then((payload) => {
      const serverLogs = normalizeServerLogs(payload)
      // 遍历服务器返回的日志
      // Iterate through the _logs returned by the server
      serverLogs.forEach((log) => {
        const { timestamp, event, result, remark } = log
        const eventKey = buildServerLogKey(timestamp, event, result, remark)
        // 判断事件是否已经展示过，避免重复
        // Check if the event has been displayed to avoid duplicates
        if (!displayedEvents.has(eventKey)) {
          // 调用已有的日志展示方法
          // Call the existing log display method
          add_Server_log(timestamp, event, result, remark)
          // 添加该事件到已展示事件列表
          // Add the event to the list of displayed events
          displayedEvents.add(eventKey)
        }
      })
    })
    .catch((error) => {
      // 添加获取服务器日志错误的记录
      // Add a record of the error in getting server _logs
      add_log(
        "Get Server Logs Error",
        "error",
        error instanceof Error ? error.message : String(error)
      )
    })
    .finally(() => {
      isFetchingServerLogs = false
    })
}

/**
 * 获取所有日志记录。
 * Get all log records.
 * @returns {Array} 包含所有日志的数组。
 * @returns {Array} An array containing all _logs.
 */
function get_logs() {
  // 从服务器获取日志
  // Get _logs from the server
  get_server_logs()
  // 返回所有日志
  // Return all _logs
  return _logs
}

/**
 * 获取所有错误日志记录。
 * Get all error log records.
 * @returns {Array} 包含所有错误日志的数组。
 * @returns {Array} An array containing all error _logs.
 */
function get_error_logs() {
  // 过滤出结果为 'error' 的日志
  // Filter out _logs with the result of 'error'
  get_server_logs()
  return _logs.filter((log) => log.result === "error")
}

/**
 * 获取所有警告日志记录。
 * Get all warning log records.
 * @returns {Array} 包含所有警告日志的数组。
 * @returns {Array} An array containing all warning _logs.
 */
function get_warning_logs() {
  // 过滤出结果为 'warning' 的日志
  // Filter out _logs with the result of 'warning'
  get_server_logs()
  return _logs.filter((log) => log.result === "warning")
}

/**
 * 获取所有成功日志记录。
 * Get all successful log records.
 * @returns {Array} 包含所有成功日志的数组。
 * @returns {Array} An array containing all successful _logs.
 */
function get_successfully_logs() {
  // 过滤出结果为 'successfully' 的日志
  // Filter out _logs with the result of 'successfully'
  get_server_logs()
  return _logs.filter((log) => log.result === "successfully")
}

/**
 * 将日志保存为 TXT 文件并下载。
 * Save _logs as a TXT file and download it.
 */
function saveLogsToTxt() {
  /**
   * 格式化 cookies 信息。
   * Format cookie information.
   * @returns {string} 格式化后的 cookies 信息。
   * @returns {string} Formatted cookie information.
   */
  // 构建日志文件内容
  // Build the content of the log file
  let content = "CCRS LOG\n"
  content += "======Base Information=====\n"
  content +=
    "Tips:Basic information Lists the user's browser, UA, and device type information\n"
  content += `Create Time: ${get_Time()}\n`
  content += `UA: ${navigator.userAgent}\n\n`

  content += "========Storage=========\n"
  content += "Tips:\n"
  content +=
    "The Storage section records snapshots of  application storage information when users download _logs\n"
  // 获取所有本地存储数据
  // Get all local storage data
  const localStorageData = storage.utils.localstorage.getAll()
  content += `Storages:\n${localStorageData}\n\n`

  content += "=========LOGS==========\n"
  content +=
    "Tips:Logs lists all _logs generated by the user from the start of the program to the user's download log\n"
  content += "Log:\n"
  content += "Time\tEvent\tResult\tComment\n"

  // 遍历日志并添加到文件内容
  // Iterate through _logs and add them to the file content
  _logs.forEach((log) => {
    content += `${log.time}\t${log.event}\t${log.result}\t${log.comment}\n`
  })

  // 生成并下载日志文件
  // Generate and download the log file
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = "CCRS_LOG.txt"
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 获取系统状态信息。
 * Get system status information.
 * @returns {string} 系统状态信息。
 * @returns {string} System status information.
 */
function get_SystemStatus() {
  // 检查是否有错误日志
  // Check if there are any error _logs
  if (get_error_logs().length === 0) {
    return "The system is running normally"
  } else {
    return "Detected " + get_error_logs().length + " error messages"
  }
}

const log = {
  get: {
    allLogs: get_logs,
    errorLogs: get_error_logs,
    warnLogs: get_warning_logs,
    successLogs: get_successfully_logs,
    serverLogs: get_server_logs,
  },
  add: add_log,
  clear:clear_log,
  serverStatus: get_SystemStatus,
  downloadLogs: saveLogsToTxt,
}

export default log
