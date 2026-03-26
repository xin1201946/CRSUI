"use client"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SettingsDialog } from "@/components/settings-dialog"
import { Toaster } from "@/components/ui/sonner"
import { SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar"
import route from "./route/route.js"
import { Mail, ScanQrCode } from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"


const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [openSettingsDialog, setOpenSettingsDialog] =
    React.useState<boolean>(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleHashChange = React.useCallback(() => {
    const hash = window.location.hash || ""
    if (hash.startsWith("#settings")) {
      setOpenSettingsDialog(true)
    } else {
      setOpenSettingsDialog(false)
    }
  }, [])

  // 初始加载 + 路由切换时检查
  React.useEffect(() => {
    handleHashChange()
  }, [pathname, handleHashChange])

  // hash 实时变化监听（浏览器前进/后退、手动改 URL）
  React.useEffect(() => {
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [handleHashChange])

  // ✅ 关键修复：同步设置 state + 更新 hash
  const handleOpenChange = (open: boolean) => {
    setOpenSettingsDialog(open) // ← 必须加上这一行！

    const base = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    const newUrl = open ? `${base}#settings` : base // 关闭时自动去掉 #settings

    router.replace(newUrl, { scroll: false })
  }
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <ThemeProvider>
          <Toaster/>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar
              variant="inset"
              sidebarData={route}
              onOpenSettings={handleOpenChange} // ← 新增 prop 传下去
            />
            <SidebarInset>
              <SiteHeader data={route} />
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <SettingsDialog
                      isOpen={openSettingsDialog}
                      setOpen={handleOpenChange}
                    />
                    {children}
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
