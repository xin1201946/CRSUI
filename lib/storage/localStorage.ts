"use client"

// 检查是否在浏览器环境
const isBrowser = typeof window !== "undefined"

const localstorage = {
  // 获取
  get: (key: string) => {
    if (!isBrowser) return null
    const value = window.localStorage.getItem(key)
    try {
      // 自动尝试解析 JSON
      return value ? JSON.parse(value) : null
    } catch {
      return value
    }
  },

  // 设置（仅当不存在时）
  set: (key: string, value: any) => {
    if (!isBrowser) return null
    window.localStorage.setItem(key, JSON.stringify(value))
  },

  // 移除
  remove: (key: string) => {
    if (isBrowser) window.localStorage.removeItem(key)
  },

  // 清空
  clear: () => {
    if (isBrowser) window.localStorage.clear()
  },

  // 获取全部
  getAll: () => {
    if (!isBrowser) return {}
    const archive: Record<string, any> = {}
    const keys = Object.keys(window.localStorage)
    for (const key of keys) {
      const value = window.localStorage.getItem(key)
      try {
        archive[key] = value ? JSON.parse(value) : null
      } catch {
        archive[key] = value
      }
    }
    return archive
  },
}

export default localstorage
