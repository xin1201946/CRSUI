"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Dialog,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { BellIcon, HomeIcon, SettingsIcon, Info, X } from "lucide-react"

import {
  HomePage,
  AdvancedPage,
  NotificationsPage,
  InfoPage
} from "@/components/settings/index"

const data = {
  nav: [
    {
      name: "主页",
      icon: <HomeIcon />,
      slug: "home",
      page: <HomePage />,
    },
    {
      name: "通知",
      icon: <BellIcon />,
      slug: "notifications",
      page: <NotificationsPage />,
    },
    {
      name: "高级",
      icon: <SettingsIcon />,
      slug: "advanced",
      page: <AdvancedPage />,
    },
    {
      name: "关于",
      icon: <Info />,
      slug: "info",
      page: <InfoPage />,
    },
  ],
}

interface SettingsDialogProps {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

export function SettingsDialog({ isOpen, setOpen }: SettingsDialogProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [nowRoute, setNowRoute] = React.useState("home")
  const [nowPage, setNowPage] = React.useState<React.ReactNode>(<HomePage />)

  // ==================== 关键新增：支持外部 URL 直接进入 ====================
  // 1. 组件挂载或 isOpen 变为 true 时，读取当前 hash 并切换到对应页面
  React.useEffect(() => {
    if (!isOpen) return

    const hash = window.location.hash || "#settings/home"
    const match = hash.match(/^#settings\/(.+)$/)
    const slug = match ? match[1] : "home"

    const targetItem = data.nav.find((item) => item.slug === slug)
    if (targetItem) {
      setNowRoute(slug)
      setNowPage(targetItem.page)
    } else {
      // 默认 fallback 到 Home
      setNowRoute("home")
      setNowPage(<HomePage />)
    }
  }, [isOpen]) // 只在 Dialog 打开时执行一次

  // 2. 点击菜单项（同时更新 hash + 页面）
  const handleNavClick = (slug: string) => {
    const newUrl = `${pathname}#settings/${slug}`
    router.replace(newUrl, { scroll: false })

    const targetItem = data.nav.find((item) => item.slug === slug)
    if (targetItem) {
      setNowRoute(slug)
      setNowPage(targetItem.page)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]"
        style={{
          backgroundColor: "var(--blurbackground)",
          backdropFilter: "blur(50px)",
        }}
      >
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>
        <SidebarProvider className="items-start">
          <Sidebar
            collapsible="none"
            className="hidden md:flex"
            style={{
              backgroundColor: "transparent",
            }}
          >
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => (
                      <SidebarMenuItem
                        key={item.name}
                        style={{ marginTop: "5px" }}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={nowRoute === item.slug}
                        >
                          <button
                            onClick={() => handleNavClick(item.slug)}
                            className="w-full"
                          >
                            {item.icon}
                            <span>{item.name}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main
            className="flex h-[480px] flex-1 flex-col overflow-hidden"
            style={{
              borderRadius: "10px",
              backgroundColor: "var(--background)",
              marginRight:"10px"
            }}
          >
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {nowPage}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
