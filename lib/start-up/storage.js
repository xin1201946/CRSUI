'use client'
import Utils from "@/lib/storage/storage.ts"
import { v4 as uuidv4 } from 'uuid';

export function initStorage(){
  const uuid = uuidv4();
  let services = [
    { key: "serverip", defaultValue: "127.0.0.1:3000" },
    { key: "use_https_service", defaultValue: false },
    { key: "UID", defaultValue: uuid },
  ]
  for (let service of services) {
    let currentValue = Utils.get(service.key)
    if (currentValue == null) {
      currentValue = service.defaultValue
      Utils.set(service.key, currentValue)
    }
  }
}