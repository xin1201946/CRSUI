import styles from "./reg.module.css"
import {Button} from "@/components/ui/button.tsx"
export default function Page(){
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>RAG 检索增强生成</h2>
      <p>This is Rag page (CCRS Recognition System)</p>

      {/* 你甚至可以在这里继续组合 Tailwind，两者不冲突 */}
      <Button >
        开始识别s
      </Button>
    </div>
  )
}