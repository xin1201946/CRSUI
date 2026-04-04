import { v4 } from "uuid"
import storage from "@/lib/storage/storage"
const UUID = {
  get: ()=>{
    return storage.get("UID")
  },
  random: ()=>{
    const uuid = v4()
    storage.set("UID", uuid)
    return uuid
  },
  init: ()=>{
    const storedUuid = storage.get("UID")
    if (typeof storedUuid !== "string") {
      const newUuid = v4()
      storage.set("UID", newUuid)
      return newUuid
    }
    return storedUuid
  }
}
export default UUID