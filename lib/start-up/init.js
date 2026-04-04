'use client'
// 当前端被载入则会执行的命令

import { initStorage } from "./storage.js"
import utils from "@/lib/server/utils/utils.ts"
let isInitialized = false

function coreServices(){
  if(!isInitialized){
    console.log("正在初始化核心服务...")
    initStorage()
    utils.socket.init()
    isInitialized = true
  }
}

function moreServices(){
  //额外服务应该写在这里
}

function fullServices() {
  coreServices()
  moreServices()
}

const initServices = {
  None:()=>null,
  CoreOnly: coreServices,
  FullServices: fullServices,
}

export default initServices