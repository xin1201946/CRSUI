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
import { Badge } from "@/components/ui/badge"
import Utils from "@/lib/utils"
import utils from "@/lib/utils"

function ServerIP(){
  const [useHttp, setUseHttp] = useState<boolean>(false)
  const [server_ip] = useState(utils.Server.get.host(false))
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
            placeholder={server_ip}
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

function ServerTest(){
  const [serverIP, setServerIP] = useState(() => {
    return Utils.Server.get.host()
  })
  const [serverStatus, setServerStatus] = useState("Unknown")
  const reflashServerIP = () => {
    setServerIP(Utils.Server.get.host())
  }
  const testServer = () =>{
    Utils.Server.apis.server.connectStatus().then(res=>{
      if (res.status === 200){
        setServerStatus("Success")
      }else{
        setServerStatus("Error")
      }
    })
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className={"flex items-center space-x-2"}>
          <span>服务器连通性测试</span>
          <Badge variant="default">{serverStatus}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <span>目标HOST：{serverIP} </span>
      </CardContent>
      <CardFooter>
        <div className={"flex w-full items-center justify-between"}>
          <Button onClick={reflashServerIP}>刷新</Button>
          <Button onClick={testServer}>联通测试</Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export function BasePage() {
  return (
    <div id={"setting-base"} className={"space-y-4 overflow-y-auto p-2"}>
      <ServerIP />
      <ServerTest />
    </div>
  )
}