"use client"
import storage from "@/lib/storage/storage"

const host = {
  get: () => {
    const host = storage.get("serverip", "127.0.0.1");
    let finally_host = "";
    if (storage.get("use_https_service", "true") == "true") {
      finally_host = "https://" + host;
    } else {
      finally_host = "http://" + host;
    }
    return finally_host
  },
  set: (host: string) => {
    storage.set("serverip", host);
  },
}

export default host;
