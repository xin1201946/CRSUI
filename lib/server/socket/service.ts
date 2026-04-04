"use client"
import { io, type Socket } from "socket.io-client"
import serverHost from "../host/server_host"
import  logs from "../../logs"
import toast  from "../../toast"
import { set_server_info } from "../status/status"
import serverUtils from "@/lib/server/utils/utils"

// 设置超时阈值，单位为毫秒
// Set the timeout threshold in milliseconds
const SOCKET_TIMEOUT = 5000

type ServerMessagePayload = {
  message: string
  [key: string]: unknown
}

type RegisterPayload = {
  message: string
  [key: string]: unknown
}

type SocketConnectionResult = {
  socket: Socket | null
  cleanup: () => void
}

/**
 * 创建并管理 socket 连接。
 * Creates and manages a socket connection.
 * @param {string} uuid - 客户端的唯一标识符。
 * @param {function} onConnect - 连接成功时的回调函数。
 * @param {function} onMessage - 收到新消息时的回调函数。
 * @param {function} onSysinfo - 收到系统信息更新时的回调函数。
 * @param {function} onRegister - 收到注册事件时的回调函数。
 * @returns {Object} - 包含 socket 实例和清理函数的对象。
 */
function createSocketConnection(
  uuid: string,
  onConnect?: ((socket: Socket) => void) | null,
  onMessage?: ((data: ServerMessagePayload) => void) | null,
  onSysinfo?: ((data: unknown) => void) | null,
  onRegister?: ((data: RegisterPayload) => void) | null
) : SocketConnectionResult {
  // Only create browser-side socket connections in the client environment.
  // Prevent SSR from touching `window` or opening sockets during render.
  if (typeof window === "undefined") {
    return {
      socket: null,
      cleanup: () => {},
    }
  }

  const host = serverHost.get() ?? ""

  // 配置 Socket.IO 选项
  // Configure Socket.IO options
  const socketOptions = {
    // 设置连接超时时间
    // Set the connection timeout
    timeout: SOCKET_TIMEOUT,
    // 使用 WebSocket 传输协议
    // Use the WebSocket transport protocol
    transports: ["websocket"],
    // 根据服务器地址判断是否使用安全连接
    // Determine whether to use a secure connection based on the server address
    secure: host.startsWith("https"),
    // 允许自签名证书
    // Allow self - signed certificates
    rejectUnauthorized: false,
    // 开启重连功能
    // Enable reconnection
    reconnection: true,
    // 最大重连尝试次数
    // Maximum number of reconnection attempts
    reconnectionAttempts: 5,
    // 重连延迟时间
    // Reconnection delay time
    reconnectionDelay: 1000,
  }

  // 创建 Socket.IO 客户端实例
  // Create a Socket.IO client instance
  const socket = io(host || undefined, socketOptions)

  // 重连尝试事件处理
  // Reconnection attempt event handling
  socket.on("reconnect_attempt", (attemptNumber) => {
    // 记录重连尝试日志
    // Record the reconnection attempt log
    logs.add("正在尝试重新连接", "warning", `第 ${attemptNumber} 次重试`)
  })

  // 重连成功事件处理
  // Reconnection success event handling
  socket.on("reconnect", (attemptNumber) => {
    // 记录重连成功日志
    // Record the reconnection success log
    logs.add("重新连接成功", "successfully", `在第 ${attemptNumber} 次尝试后`)
    // 重新向服务器注册
    // Re - register with the server
    socket.emit("register", { uuid })
  })

  // 向服务器发送注册请求
  // Send a registration request to the server
  socket.emit("register", { uuid })

  // 连接成功事件处理
  // Connection success event handling
  socket.on("connect", () => {
    // 调用自定义连接成功回调函数
    // Call the custom connection success callback function
    onConnect?.(socket)
  })

  // 收到新消息事件处理
  // New message received event handling
  socket.on("new_message", (data: ServerMessagePayload) => {
    // 记录收到消息日志
    // Record the log of receiving a message
    logs.add("收到服务器消息", "successfully", data.message)
    // 发送通知
    // Send a notification
    toast.send("Server", data.message)
    // 调用自定义消息处理回调函数
    // Call the custom message handling callback function
    onMessage?.(data)
  })

  // 系统信息更新事件处理
  // System information update event handling
  socket.on("sysinfo_update", (data) => {
    // 解析收到的系统信息
    // Parse the received system information
    const parsedData = JSON.parse(data)
    // 调用自定义系统信息处理回调函数
    // Call the custom system information handling callback function
    onSysinfo?.(parsedData)
  })

  // 注册事件处理
  // Registration event handling
  socket.on("register", (data: RegisterPayload) => {
    if (data.message === "客户端注册成功") {
      // 记录注册成功日志
      // Record the registration success log
      logs.add("已与服务器建立连接", "successfully")
    } else {
      // 记录注册失败日志
      // Record the registration failure log
      logs.add("注册失败", "error", data.message)
    }
    // 调用自定义注册事件回调函数
    // Call the custom registration event callback function
    onRegister?.(data)
  })

  // 连接错误事件处理
  // Connection error event handling
  socket.on("connect_error", (error) => {
    // 判断服务器使用的协议
    // Determine the protocol used by the server
    const protocol = host.startsWith("https") ? "HTTPS" : "HTTP"
    // 记录连接失败日志
    // Record the connection failure log
    logs.add(`${protocol}连接失败`, "error", `${error.message}`)

    // 如果是 SSL 相关错误，给出更明确的提示
    // If it is an SSL - related error, give a more specific prompt
    if (
      error.message.includes("SSL") ||
      error.message.includes("certificate")
    ) {
      toast.send("连接错误", "服务器SSL证书验证失败，请检查证书配置")
    }
  })

  // 清理函数，用于关闭连接和移除事件监听器
  // Cleanup function to close the connection and remove event listeners
  const cleanup = () => {
    // 移除所有事件监听器
    // Remove all event listeners
    window.removeEventListener("beforeunload", cleanup)
    socket.off()
    // 关闭 Socket.IO 连接
    // Close the Socket.IO connection
    socket.close()
  }

  // 监听窗口关闭事件，在关闭前执行清理操作
  // Listen for the window beforeunload event and perform cleanup before closing

  window.addEventListener("beforeunload", cleanup)

  // 返回包含 socket 实例和清理函数的对象
  // Return an object containing the socket instance and the cleanup function
  return {
    socket,
    cleanup,
  }
}

/**
 * 刷新系统信息，创建一个新的 socket 连接。
 * Refreshes system information by creating a new socket connection.
 */
export function reflash_sysInfo() {
  // 生成一个新的唯一标识符
  // Generate a new unique identifier
  const uuid: string = serverUtils.uuid.init().toString()
  // 创建 socket 连接，不使用回调函数
  // Create a socket connection without using callback functions
  createSocketConnection(String(uuid))
}

/**
 * 订阅服务器通知，使用已有 UUID 创建 socket 连接。
 * Subscribes to server notifications by creating a socket connection with an existing UUID.
 */
export function subscribeToServerNotifications() {
  // 从设置中获取唯一标识符
  // Get the unique identifier from the settings
  const uuid = serverUtils.uuid.init()

  // 创建 socket 连接，并设置回调函数
  // Create a socket connection and set callback functions
  createSocketConnection(
    String(uuid),
    () => {
      // 记录连接成功日志
      // Record the connection success log
      logs.add("已与服务器建立连接", "successfully")
    },
    (data) => {
      // 处理服务器通知
      // Process server notifications
      logs.add("收到服务器消息", "successfully", data.message)
      // 发送通知
      // Send a notification
      toast.send("Server Notify", data.message)
    },
    (data) => {
      // 设置服务器信息
      // Set server information
      set_server_info(data)
    },
    null
  )
}

