"use client"
import styles from "./reg.module.css"
import { UploadBox } from "@/components/upload-box"
import { Button } from "@/components/ui/button"
import { useState } from "react"
export default function Page(){
  const [uploadState, setUploadState] = useState(false)
  return (
    <div className={styles.container}>
      <UploadBox
        data={{
          uploadUrl: "http://192.168.1.90:5000/predict",
          allowFile: [".jpg", ".png"],
          disableUpload: false,
          prompt: "点击上传图片",
          ifSuccess: () => setUploadState(true),
        }}
      />
      <Button disabled={!uploadState}>开始识别</Button>
    </div>
  )
}