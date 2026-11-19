import { createFileRoute, Link } from "@tanstack/react-router";
import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "本地模式 · 动画课堂 ClipLab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LocalModeInfo,
});

function LocalModeInfo() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-hero px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 text-center shadow-raised">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <HardDrive className="size-6" />
        </span>
        <h1 className="text-xl font-semibold">当前使用本地模式</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          ClipLab 第一阶段不需要注册或登录。你的动画、片段和备课资料保存在当前浏览器的本地数据库中。
        </p>
        <Button asChild className="mt-6 w-full"><Link to="/dashboard">进入备课工作台</Link></Button>
        <p className="mt-3 text-xs text-muted-foreground">更换设备前，请先在「数据备份与恢复」中导出资料。</p>
      </section>
    </main>
  );
}
