import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Storages from "@/lib/storage/storage"
import Toast from "@/lib/toast"
import InitServices from "@/lib/start-up/init"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const Utils = {
  Storage:Storages,
  Toast:Toast,
  InitServices:InitServices
}

export default Utils