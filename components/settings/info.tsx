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
import { ExternalLinkIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import Grainient from"@/components/Grainient"

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
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ marginTop: "20px" }}
    >
      {/* Logo / Title */}
      <div className="mx-auto flex max-w-lg flex-col" style={{ width: "100%" }}>
        <div
          className="relative mb-8 overflow-hidden"
          style={{ borderRadius: "20px" }}
        >
          {/* Text overlay positioned at the top of the gradient */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4">
            <h2
              className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight drop-shadow-lg"
              style={{
                fontSize: "50px",
                color: "var(--blurforegroundWithPic)",
              }}
            >
              CCRS UI
            </h2>
          </div>
          <Grainient
            color1="#00f900"
            color2="#00a3d7"
            color3="#b1dd8c"
            timeSpeed={0.6}
            colorBalance={0}
            warpStrength={1}
            warpFrequency={5}
            warpSpeed={2}
            warpAmplitude={50}
            blendAngle={7}
            blendSoftness={0.1}
            rotationAmount={500}
            noiseScale={2.95}
            grainAmount={0.11}
            grainScale={0.2}
            grainAnimated
            contrast={1.3}
            gamma={1.7}
            saturation={1.35}
            centerX={0}
            centerY={0}
            zoom={0.9}
          />
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
              <ExternalLinkIcon className="size-4" />
            </ItemActions>
          </Item>
        </DialogTrigger>
        <DialogContent
          className="w-100 overflow-hidden"
          style={{
            backgroundColor: "var(--blurbackground)",
            backdropFilter: "blur(20px)",
          }}
        >
          <DialogHeader>
            <DialogTitle>本项目引用以下开源项目</DialogTitle>
            <DialogDescription>
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
            </DialogDescription>
          </DialogHeader>
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
