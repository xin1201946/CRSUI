"use client"

import * as React from "react"
import {  ScanQrCode, Settings2Icon } from "lucide-react" // 确保导入了图标
import { NavMain } from "@/components/nav-main"
import {ChangeThemeTab} from "@/components/change-theme-tab"
import { NavSecondary } from "@/components/nav-secondary"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// 1. 定义数据结构类型 (根据你的 data.json 结构调整)
export interface SidebarData {
  navMain: {
    title: string
    url: string
    icon?: any
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  navSecondary: {
    title: string
    url: string
    icon: any
  }[]
}

// 2. 扩展 Props 定义
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sidebarData: SidebarData // 传入的数据
  onOpenSettings
}

export function AppSidebar({ sidebarData, onOpenSettings,...props }: AppSidebarProps) {

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <ScanQrCode className="size-5!" />
                <span className="text-base font-semibold">CCRS UI</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className={"gap-2"}>
        {/* 3. 使用传入的 sidebarData */}
        <NavMain items={sidebarData.navMain} />
        <NavSecondary items={sidebarData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton asChild>
          <button onClick={() => onOpenSettings?.(true)}>
            <Settings2Icon />
            <span>设置</span>
          </button>
        </SidebarMenuButton>
        <ChangeThemeTab />
      </SidebarFooter>
    </Sidebar>
  )
}
