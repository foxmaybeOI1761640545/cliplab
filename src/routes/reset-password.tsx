import { createFileRoute, Link } from "@tanstack/react-router";
import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
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
        <h1 className="text-xl font-semibold">无需重置密码</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          当前 ClipLab 使用本地存储模式，不需要账户或密码。你的资料保存在当前浏览器中。
        </p>
        <Button asChild className="mt-6 w-full"><Link to="/dashboard">返回备课工作台</Link></Button>
      </section>
    </main>
  );
}
