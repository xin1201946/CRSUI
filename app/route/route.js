import {
  House,
  ScanText,
  SquareChevronRight,
} from "lucide-react"

const route = {
  navMain: [
    {
      title: "主页",
      url: "/",
      icon: <House />,
    },
    {
      title: "识别",
      url: "/reg",
      icon: <ScanText />,
    },
    {
      title: "控制台",
      url: "/console",
      icon: <SquareChevronRight />,
    },
  ],
  navSecondary: [
  ],
}

export default route