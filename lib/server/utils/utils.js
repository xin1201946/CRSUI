"use client"
import apis from "../api/server_api.tsx"
import host from "../host/server_host.tsx"
import storage from "../../storage/storage.ts"
/**
 * @param {string} url          目标端点（例如 '/api/users' 或完整 URL）
 * @param {object} params       载体（自动转为 URL 参数 ?key=value&...）
 * @returns {Promise<any>}      返回解析后的 JSON 数据
 */
async function get(url, params = {}) {
  // 1. 把 params 对象转成 query string
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString()
    // 智能拼接 ? 或 &
    url += url.includes("?") ? "&" + queryString : "?" + queryString
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors", // 允许跨域
      credentials: "include", // 跨域时携带 cookie（推荐，防止登录态丢失）
    })

    if (!response.ok) {
      throw new Error(`GET 请求失败，状态码: ${response.status}`)
    }

    return await response.json() // 默认返回 JSON，你也可以改成 .text() / .blob()
  } catch (error) {
    console.error("GET 请求出错:", error)
    throw error // 让调用方自己 catch
  }
}

/**
 * @param {string} url      目标端点
 * @param {object|FormData} data  载体
 *                          - 普通对象 → 自动 JSON
 *                          - FormData  → 自动文件上传（支持多个文件）
 * @returns {Promise<any>}
 */
async function post(url, data = {}) {
  const options = {
    method: "POST",
    mode: "cors",
    credentials: "include",
  }

  if (data instanceof FormData) {
    options.body = data
    // 上传文件时不要手动设置 Content-Type
  } else {
    options.headers = { "Content-Type": "application/json" }
    options.body = JSON.stringify(data)
  }

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`POST 请求失败，状态码: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("POST 请求出错:", error)
    throw error
  }
}

const utils = {
  set: {
    host: {
      set: host.set,
      get: host.get,
    },
    useHttps:(state)=>{

      console.log(
        state,
        storage.get("use_https_service"),
        storage.set("use_https_service", state)
      )
    }
  },
  apis: {
    ports: apis,
    client: {
      signIn: async (uuid) => {
        const url = `${host.get()}${apis.client.signIn}`
        return await get(url, { uuid: uuid })
      },
      logOut: async (uuid) => {
        const url = `${host.get()}${apis.client.logOut}`
        return await get(url, { uuid: uuid })
      },
    },
    picture: {
      upload: async (uuid, file) => {
        const url = `${host.get()}${apis.picture.upload}`
        return await post(url, { uuid: uuid, file })
      },
      getUploadPic: async (uuid) => {
        const url = `${host.get()}${apis.picture.get}`
        return await get(url, { uuid: uuid })
      },
      deleteUploadPic: async (uuid) => {
        const url = `${host.get()}${apis.picture.delete}`
        return await get(url, { uuid: uuid })
      },
    },
    server: {
      connectStatus: async () => {
        const url = `${host.get()}${apis.server.info}`
        return await get(url)
      },
      getServerLogs: async () => {
        const url = `${host.get()}${apis.server.logs}`
        return await get(url)
      },
    },
    ocr: {
      startOCR: async (uuid) => {
        const url = `${host.get()}${apis.ocr.start}`
        return await get(url, { uuid: uuid })
      },
      getStatus: {
        allTask: async (uuid) => {
          const url = `${host.get()}${apis.ocr.status}`
          return await get(url, { uuid: uuid })
        },
        byTask: async (taskID) => {
          const url = `${host.get()}${apis.ocr.status}`
          return await get(url, { task: taskID })
        },
      },
    },
  },
}

export default utils
