"use client"

// 检查是否在浏览器环境
const isBrowser = typeof window !== "undefined"

const sessionstorage = {
  // 获取
  get: (key: string) => {
    if (!isBrowser) return null
    const value = window.sessionStorage.getItem(key)
    try {
      // 自动尝试解析 JSON
      return value ? JSON.parse(value) : null
    } catch {
      return value
    }
  },

  // 设置（仅当不存在时）
  set: (key: string, value: any) => {
    if (!isBrowser) return
    // 原生返回 null 代表不存在
    if (window.sessionStorage.getItem(key) !== null) return
    window.sessionStorage.setItem(key, JSON.stringify(value))
  },

  // 修改（仅当存在时）
  update: (key: string, value: any) => {
    if (!isBrowser) return
    if (window.sessionStorage.getItem(key) === null) return
    window.sessionStorage.setItem(key, JSON.stringify(value))
  },

  // 移除
  remove: (key: string) => {
    if (isBrowser) window.sessionStorage.removeItem(key)
  },

  // 清空
  clear: () => {
    if (isBrowser) window.sessionStorage.clear()
  },

  // 获取全部
  getAll: () => {
    if (!isBrowser) return {}
    const archive: Record<string, any> = {}
    const keys = Object.keys(window.sessionStorage)
    for (const key of keys) {
      const value = window.sessionStorage.getItem(key)
      try {
        archive[key] = value ? JSON.parse(value) : null
      } catch {
        archive[key] = value
      }
    }
    return archive
  },
}

export default sessionstorage
