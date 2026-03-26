"use client"

import  localstorage  from "./localStorage"
import sessionstorage from "./sessionStorage"

// 检查是否在浏览器环境
const isBrowser = typeof window !== "undefined"

const Storages = {
  get:(key:string)=>{
    if(!isBrowser) return null;
    if (sessionstorage.get(key) != null) return sessionstorage.get(key)
    return localstorage.get(key)
  },
  set:(key:string,value:any,useSessionStorage:boolean=false)=>{
    if (!isBrowser) return null
    if (useSessionStorage) return sessionstorage.set(key, value)
    return localstorage.set(key, value)
  },
  remove:(key:string)=>{
    if(!isBrowser) return null;
    if (localstorage.get(key) == null) {
      sessionstorage.remove(key)
    }
    localstorage.remove(key)
  },
  utils:{
    localstorage:localstorage,
    sessionStorage:sessionstorage,
  }
}

export default Storages