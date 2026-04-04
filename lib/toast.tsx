"use client"
import { toast } from "sonner"
import storage from "./storage/storage"

// 定义通知对象的类型
export interface NotificationItem {
  id: string | number
  title: string
  message: string | null
  type: string
  timestamp: number
  data: any
}

// 内部存储列表
let toastHistory: NotificationItem[] = []

// 👇 订阅器
const listeners = new Set<(list: NotificationItem[]) => void>()

// 👇 通知所有订阅者
const notify = () => {
  const sorted = [...toastHistory].sort((a, b) => b.timestamp - a.timestamp)
  listeners.forEach((cb) => cb(sorted))
}

const TOAST_DUPLICATE_WINDOW_MS = 5000

const buildToastFingerprint = (
  title: string,
  message: string | null,
  type: string
) => {
  return `${title.trim()}::${(message ?? "").trim()}::${type.trim()}`
}

const Toast = {
  /**
   * 订阅通知变化
   */
  subscribe: (callback: (list: NotificationItem[]) => void) => {
    listeners.add(callback)

    // 立即返回当前数据（避免 UI 初始为空）
    callback([...toastHistory].sort((a, b) => b.timestamp - a.timestamp))

    return () => listeners.delete(callback)
  },

  /**
   * 发送通知并记录
   */
  send: (
    title: string,
    message: string = null,
    type: string = "default",
    action: any = null
  ) => {
    const position =
      typeof window !== "undefined"
        ? storage.get("toastPosition") || "top-right"
        : "top-right"

    const timestamp = Date.now()

    const fingerprint = buildToastFingerprint(title, message, type)

    const duplicated = toastHistory.find(
      (item) =>
        buildToastFingerprint(item.title, item.message, item.type) === fingerprint &&
        timestamp - item.timestamp < TOAST_DUPLICATE_WINDOW_MS
    )

    if (duplicated) {
      return duplicated.id
    }

    const data = {
      description: message,
      position: position as any,
      action: action,
      closeButton:true,
    } as any

    try {
      const toastId = toast(title, data)

      const newNotification: NotificationItem = {
        id: toastId,
        title,
        message,
        type,
        timestamp,
        data,
      }

      toastHistory.push(newNotification)

      notify() // 👈 关键：触发更新

      return toastId
    } catch (error) {
      console.error("Toast send error:", error)
      return -1
    }
  },

  /**
   * 获取所有通知列表 (按时间倒序)
   */
  list: () => {
    return [...toastHistory].sort((a, b) => b.timestamp - a.timestamp)
  },

  /**
   * 删除特定的通知记录
   */
  remove: (id: string | number, dismissVisual: boolean = true) => {
    toastHistory = toastHistory.filter((item) => item.id !== id)

    if (dismissVisual) {
      toast.dismiss(id)
    }

    notify() // 👈 别忘了
  },

  /**
   * 更新通知
   */
  update: (
    id: string | number,
    updates: Partial<Pick<NotificationItem, "title" | "message" | "type">>
  ) => {
    const index = toastHistory.findIndex((item) => item.id === id)

    if (index !== -1) {
      toastHistory[index] = {
        ...toastHistory[index],
        ...updates,
        timestamp: Date.now(),
      }

      const item = toastHistory[index]

      toast(item.title, {
        id: id,
        description: item.message,
      })

      notify() // 👈 继续补

      return true
    }

    return false
  },

  /**
   * 清空所有记录
   */
  clearHistory: () => {
    toastHistory = []
    notify()
  },
}

export default Toast
