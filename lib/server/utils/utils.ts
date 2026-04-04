"use client"

import apis from "../api/server_api.tsx"
import host from "../host/server_host.tsx"
import storage from "../../storage/storage.ts"
import { subscribeToServerNotifications as init_socket} from "../socket/service"
import UUID from "./uuid"
import getServerInfoSnapshot from "../status/status"

export interface ResultData<T = unknown, E = unknown> {
  status: number
  targetIP: string
  type: string
  params: Record<string, unknown> | null
  response: T | null
  isError: boolean
  errors: E | null
}

// 通用请求函数（你之前那套复制粘贴地狱终于可以退休了）
async function request<T = unknown>(
  url: string,
  options: RequestInit & { params?: Record<string, unknown> } = {}
): Promise<ResultData<T>> {
  const { params, ...fetchOptions } = options

  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString()
    url += url.includes("?") ? `&${queryString}` : `?${queryString}`
  }

  const result: ResultData<T> = {
    status: 0,
    targetIP: url,
    type: fetchOptions.method || "GET",
    params: params || null,
    response: null,
    isError: false,
    errors: null,
  }

  try {
    const response = await fetch(url, {
      mode: "cors",
      credentials: "include",
      ...fetchOptions,
    })

    result.status = response.status

    try {
      result.response = await response.json()
    } catch {
      result.response = null
    }

    if (!response.ok) {
      result.isError = true
    }

    return result
  } catch (error) {
    result.isError = true
    result.errors = error
    return result
  }
}

// 封装 GET / POST（终于不像复制作业了）
const get = <T = unknown>(url: string, params?: Record<string, unknown>) =>
  request<T>(url, { method: "GET", params })

const post = <T = unknown>(url: string, data: any = {}) => {
  const isFormData = data instanceof FormData

  return request<T>(url, {
    method: "POST",
    body: isFormData ? data : JSON.stringify(data),
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
  })
}

const utils = {
  get: {
    serverStatus: getServerInfoSnapshot,
    host: host.get,
  },
  set: {
    host: {
      set: host.set,
      get: host.get,
    },
    useHttps: (state: boolean) => {
      storage.set("use_https_service", state)
    },
  },
  uuid: {
    get: UUID.get,
    random: UUID.random,
    init: UUID.init,
  },
  socket: {
    init: init_socket,
  },
  apis: {
    ports: apis,

    client: {
      signIn: (uuid: string) =>
        get(`${host.get()}${apis.client.signIn}`, { uuid }),

      logOut: (uuid: string) =>
        get(`${host.get()}${apis.client.logOut}`, { uuid }),
    },

    picture: {
      upload: (uuid: string, file: File) => {
        const form = new FormData()
        form.append("file", file)
        return post(`${host.get()}${apis.picture.upload}?uuid=${uuid}`, form)
      },

      getUploadPic: (uuid: string) =>
        get(`${host.get()}${apis.picture.get}`, { uuid }),

      deleteUploadPic: (uuid: string) =>
        get(`${host.get()}${apis.picture.delete}`, { uuid }),
    },

    server: {
      connectStatus: () => get(`${host.get()}${apis.server.info}`),
      getServerLogs: () => get(`${host.get()}${apis.server.logs}`),
    },

    ocr: {
      startOCR: (uuid: string) =>
        get(`${host.get()}${apis.ocr.start}`, { uuid }),

      getStatus: {
        allTask: (uuid: string) =>
          get(`${host.get()}${apis.ocr.status}`, { uuid }),

        byTask: (taskID: string) =>
          get(`${host.get()}${apis.ocr.status}`, { task: taskID }),
      },
      ocrHistory: () => get(`${host.get()}${apis.ocr.history}`),
    },
  },
}

export default utils
