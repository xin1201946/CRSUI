import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemMedia,
} from "@/components/ui/item"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { ArrowUpRightIcon, ChevronRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import Dither from "@/components/Dither"

function UserCard(){
  return (
    <HoverCard openDelay={10} closeDelay={100}>
      <HoverCardTrigger asChild style={{ margin: "0", padding: "0" }}>
        <Avatar>
          <AvatarImage
            src="https://avatars.githubusercontent.com/u/70047091?v=4"
            alt="@xin1201946"
            className="grayscale"
          />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </HoverCardTrigger>
      <HoverCardContent className="flex w-64 flex-col gap-0.5">
        <div className="font-semibold">@xin1201946</div>
        <div>Full-stack tinkerer</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Maintained by xin1201946 • Built with Next.js
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function InfoPage() {
  const [isDarkMode,setDarkMode] = useState(false)
  const { resolvedTheme } = useTheme()
  const infoData = [
    { name: "版本", value: "1.0" },
    { name: "作者", value: <UserCard/> },
    { name: "构建日期", value: "2026.03.27" },
    { name: "技术栈", value: "Next.js" },
  ]

  const openSource = [
    {
      name: "Next.js",
      url: "https://nextjs.org/",
      image: "https://avatars.githubusercontent.com/u/14985020",
      introduction: "支持 SSR 与 SSG 的生产级 React 全栈框架",
    },
    {
      name: "shadcn/ui",
      url: "https://ui.shadcn.com/",
      image: "https://avatars.githubusercontent.com/u/139895814",
      introduction: "基于 Tailwind CSS 的开源 UI 组件集合",
    },
    {
      name: "Lucide",
      url: "https://lucide.dev/",
      image: "https://avatars.githubusercontent.com/u/66879934",
      introduction: "由社区驱动的现代化开源 SVG 矢量图标库",
    },
    {
      name: "CCRS UI",
      url: "https://github.com/xin1201946/CRS/",
      image:
        "https://raw.githubusercontent.com/xin1201946/CRS/refs/heads/master/public/128x128.webp",
      introduction: "开源的轮毂铸造字符识别系统前端交互界面",
    },
  ]
  useEffect(() => {
    setDarkMode(resolvedTheme === "dark")
    console.log(resolvedTheme)
  }, [resolvedTheme])
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ marginTop: "20px" }}
    >
      {/* Logo / Title */}
      <div className="mx-auto flex max-w-lg flex-col" style={{ width: "100%" }}>
        <div
          className="relative mb-8 min-h-[220px] overflow-hidden"
          style={{ borderRadius: "20px" }}
        >
          {/* Text overlay positioned at the top of the gradient */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4">
            <h2
              className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight drop-shadow-lg"
              style={{
                fontSize: "50px",
              }}
            >
              CCRS UI
            </h2>
            <p className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span>
                <Badge asChild>
                  <a
                    href="https://github.com/xin1201946/CRSUI"
                    target={"_blank"}
                  >
                    Github <ArrowUpRightIcon data-icon="inline-end" />
                  </a>
                </Badge>
              </span>
            </p>
          </div>
          {isDarkMode ? (
            <Dither
              waveColor={[
                0.08235294117647059, 0.11372549019607843, 0.3568627450980392,
              ]}
              disableAnimation={false}
              enableMouseInteraction={false}
              mouseRadius={1}
              colorNum={7}
              pixelSize={4}
              waveAmplitude={0.35}
              waveFrequency={3.5}
              waveSpeed={0.05}
            />
          ) : (
            <div className="absolute inset-0 z-0 rounded-lg bg-linear-to-br from-blue-100 via-green-100 to-cyan-100 opacity-50" />
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div
        className="w-full rounded-xl border bg-card"
        style={{ padding: "5px", margin: "10px" }}
      >
        {infoData.map((item, index) => (
          <div
            key={item.name}
            className={`flex items-center justify-between p-4 ${
              index !== infoData.length - 1 ? "border-b" : ""
            }`}
          >
            <span className="d text-sm font-medium">{item.name}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>

      <Dialog>
        <DialogTitle></DialogTitle>
        <DialogTrigger style={{ width: "100%" }}>
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>第三方开源致谢</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ChevronRight className="size-4" />
            </ItemActions>
          </Item>
        </DialogTrigger>
        <DialogContent
          className="overflow-hidden"
          style={{
            backgroundColor: "var(--blurbackground)",
            backdropFilter: "blur(20px)",
          }}
        >
          <DialogHeader>引用的开源项目</DialogHeader>
          <DialogDescription></DialogDescription>
          <ScrollArea className="h-72 rounded-md">
            {openSource.map((item) => (
              <Item
                variant="outline"
                key={item.name}
                asChild
                style={{ marginTop: "10px" }}
              >
                <a href={item.url} target={"_blank"}>
                  <ItemMedia>
                    <Avatar size="sm">
                      <AvatarImage
                        src={item.image}
                        alt={item.name}
                        className="grayscale"
                      />
                      <AvatarFallback>
                        {item.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{item.name}</ItemTitle>
                  </ItemContent>
                  <ItemDescription>{item.introduction}</ItemDescription>
                </a>
              </Item>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {/* Footer */}
      <div
        className="mt-10 text-xs text-muted-foreground"
        style={{ margin: "20px" }}
      >
        <p>© 2026 CCRS UI. All rights reserved.</p>
      </div>
    </div>
  )
}
