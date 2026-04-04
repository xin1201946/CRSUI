"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { ReactNode } from "react"

// 复用你定义的数据结构
export interface SiteHeaderData {
  navMain: {
    title: string
    url: string
    items?: {
      title: string
      url: string
    }[]
  }[]
  navSecondary: {
    title: string
    url: string
  }[]
}

interface SiteHeaderProps {
  data: SiteHeaderData // 建议直接传整个数据对象
  titleAfter?: ReactNode
}

export function SiteHeader({ data, titleAfter }: SiteHeaderProps) {
  const pathname = usePathname()

  // 1. 自动查找当前标题的逻辑
  const getActiveTitle = () => {
    // 遍历主菜单
    for (const item of data.navMain) {
      // 匹配一级菜单
      if (item.url === pathname) return item.title

      // 匹配二级子菜单
      if (item.items) {
        const subItem = item.items.find((sub) => sub.url === pathname)
        if (subItem) return subItem.title
      }
    }

    // 遍历次要菜单
    const secondaryItem = data.navSecondary.find(
      (item) => item.url === pathname
    )
    if (secondaryItem) return secondaryItem.title

    return "CCRS UI" // 兜底默认标题
  }

  const currentTitle = getActiveTitle()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {/* 2. 动态渲染找到的标题 */}
        <div className="flex items-center gap-2">
          <h1 className="text-base font-medium">{currentTitle}</h1>
          {titleAfter != null ? (
            <div className="flex items-center">{titleAfter}</div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
