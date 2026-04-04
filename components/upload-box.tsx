"use client";

import { useState, useId, useMemo, ChangeEvent, useEffect } from "react";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import utils from "@/lib/server/utils/utils"

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadBoxProps {
  data: {
    uploadUrl: string;
    allowFile?: string[];
    disableUpload?: boolean;
    prompt?: string;
    ifSuccess?:()=>void;
    ifFail?:()=>void;
  };
}

export function UploadBox({ data }: UploadBoxProps) {
  const uniqueId = useId();
  const inputId = `file-upload-${uniqueId}`;

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDisabled = data.disableUpload || status === "uploading"

  const acceptString = useMemo(() => {
    if (!data.allowFile || data.allowFile.length === 0) return "image/*";
    return data.allowFile
      .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`))
      .join(", ");
  }, [data.allowFile]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isDisabled) return;


    setStatus("uploading");
    setErrorMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    const localPreview = URL.createObjectURL(file);


    try {
      // 4. 发送 POST 请求到特定的远程 URL
      const result = await utils.apis.picture.upload(
        utils.uuid.init().toString(),
        file
      )

      if (!result.isError) {
        // 5. 上传成功：展示预览图，应用绿色厚边框
        setPreviewUrl(localPreview)
        setStatus("success")
        console.log("文件上传成功")
        data.ifSuccess?.()
      } else {
        setStatus("error")
        setPreviewUrl(localPreview)
        setErrorMessage(`服务器拒绝: ${result.errors}`)
        data.ifFail?.()
      }
    } catch (error) {
      console.error("上传网络异常:", error);
      setStatus("error");
      setErrorMessage("网络请求失败，请检查远程服务。");
    } finally {
      e.target.value = "";
    }
  };

  // --- 动态 CSS 计算 (像素级优化) ---
  const labelClasses = cn(
    "group relative z-20 flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden transition-all duration-300 backdrop-blur-sm",
    // 基础样式
    "rounded-[10px] bg-background/50 text-muted-foreground",
    // 状态 1: Idle (默认虚线框)
    status === "idle" && "border-2 border-dashed border-muted-foreground/50 hover:border-primary hover:bg-primary/5 hover:text-primary",
    // 状态 2: Uploading (可选：可以像 idle，或者加个轻微呼吸灯效果)
    status === "uploading" && "border-2 border-dashed border-muted-foreground/50 cursor-not-allowed opacity-70",
    // 状态 3: Success (满足要求：4px 绿色实线边框)
    // 提示：建议在 globals.css 中定义 --ccrs-green，这里直接引用
    status === "success" && "border-4 border-solid border-[--ccrs-green, theme(colors.green.500)] shadow-lg shadow-[--ccrs-green, theme(colors.green.500)]/20",
    // 状态 4: Error (满足要求：4px 红色实线边框)
    status === "error" && "border-4 border-solid border-destructive shadow-lg shadow-destructive/20",
    // Disabled 状态处理
    data.disableUpload && "cursor-not-allowed opacity-50 hover:border-muted-foreground/50 hover:bg-background/50"
  );

  return (
    <div className={"p-4 flex flex-col items-center"}>
      <label
        htmlFor={inputId}
        className={labelClasses}
        title={errorMessage || acceptString}
      >
        {/* 核心内容渲染逻辑 */}
        {previewUrl ? (
          // 状态：Success 或 Error (展示预览图)
          // 使用 object-cover 确保轮毂照片不拉伸
          <img
            src={previewUrl}
            alt="模具预览"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : status === "uploading" ? (
          // 状态：Uploading (展示旋转 Loader)
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          // 状态：Idle (展示 Plus 图标)
          <Plus className="h-5 w-5 transition-transform group-hover:scale-110" />
        )}

        {/* 错误状态下的状态图标叠加 (增强提示结果) */}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        )}

        {/* 隐藏的文件 Input */}
        <input
          type="file"
          accept={acceptString}
          onChange={handleFileChange}
          className="hidden"
          id={inputId}
          disabled={isDisabled}
        />
      </label>
      {data.prompt && <p style={{color:"var(--color-ring)"}} className={"p-3"}>{data.prompt}</p>}
    </div>
  )
}