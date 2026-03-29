'use client'
// 当前端被载入则会执行的命令

import { initStorage } from "./storage.js"

function coreServices(){
  initStorage()
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