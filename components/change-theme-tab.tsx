"use client"
import { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {useTheme } from "next-themes"
import { SunMedium, Moon, Laptop } from "lucide-react"

export function ChangeThemeTab() {
  const [mounted, setMounted] = useState(false)
  const { setTheme, theme } = useTheme()
  // 这里的 useEffect 只会在客户端运行
  useEffect(() => {
    setMounted(true)
  }, [])

  // 在挂载完成前，返回一个占位符或静态版本
  if (!mounted) {
    return <div className="h-9 w-[200px] animate-pulse rounded-md bg-muted" />
  }
  return (
    <Tabs
      defaultValue={theme}
      onValueChange={(e) => {
        setTheme(e)
      }}
    >
      <TabsList>
        <TabsTrigger value="light">
          <SunMedium />
        </TabsTrigger>
        <TabsTrigger value="dark">
          <Moon />
        </TabsTrigger>
        <TabsTrigger value="system">
          <Laptop />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
