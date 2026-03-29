import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"
import Utils from "@/lib/utils"

function ServerIP(){
  const [useHttp, setUseHttp] = useState<boolean>(false)
  const server_ip_input_box = useRef(null)
  useEffect(() => {
    Utils.Server.set.useHttps(useHttp)
  },[useHttp])
  const setHostIP = () => {
    const value = server_ip_input_box.current?.value
    Utils.Server.set.host.set(value)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>服务器地址</CardTitle>
        <CardDescription>保存后立即生效</CardDescription>
      </CardHeader>
      <CardContent>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>http{useHttp ? "s" : ""}://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            ref={server_ip_input_box}
            placeholder="example.com"
            className="pl-0.5!"
          />
        </InputGroup>
      </CardContent>
      <CardFooter>
        <div className={"flex w-full items-center justify-between"}>
          <div className="flex items-center space-x-2">
            <Switch id="http-mode" onCheckedChange={setUseHttp} />
            <Label htmlFor="http-mode">使用HTTPS连接</Label>
          </div>
          <Button onClick={setHostIP}>保存</Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export function BasePage() {
  return (
    <div id={"setting-base"} className={"m-3"}>
      <ServerIP/>
    </div>
  )
}