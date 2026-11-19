import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Columns3, Film, ListOrdered, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "动画课堂 ClipLab｜主题拆解与剪辑备课工作台" },
      {
        name: "description",
        content: "为七年级教师整理国产动画短片段、拆解友情、自制力、情绪管理等主题，并安排 40 分钟课堂流程的个人备课工具。",
      },
      { property: "og:title", content: "动画课堂 ClipLab｜主题拆解与剪辑备课工作台" },
      { property: "og:description", content: "整理动画短片段、拆解主题、安排 40 分钟课堂流程。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Film, title: "片段优先", text: "以 1–5 分钟短片段为单位整理，记录时间码、重点画面与剪辑提示。" },
  { icon: Columns3, title: "主题对照", text: "同一主题下并排比较不同作品的片段、提问与讨论目标。" },
  { icon: ListOrdered, title: "五阶段课堂流程", text: "引出问题 → 提出冲突 → 推进解决 → 展示结果 → 课堂总结。" },
  { icon: Clock, title: "40 分钟用时把控", text: "自动汇总每阶段用时，超时或剩余时间一目了然。" },
  { icon: ShieldCheck, title: "资源手动核实", text: "播放可用性与版权状态分开记录，默认「待核实」，绝不自动认定。" },
];

function Index() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Film className="size-4" />
          </span>
          <span className="font-display font-semibold">动画课堂 ClipLab</span>
        </span>
        <Button asChild variant="outline"><Link to="/dashboard">进入工作台</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-16">
        <p className="mb-3 inline-flex rounded-full bg-warm-soft px-3 py-1 text-xs font-medium text-warm-foreground">七年级 · 本地优先 · 无需注册</p>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
          把动画片段，
          <br />
          拆成一节 40 分钟的好课。
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          整理国产动画的集数与短片段，拆解友情、自制力、情绪管理、合作等主题，设计提问与讨论，并安排完整的课堂流程。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/dashboard">进入备课工作台</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/data">管理本地数据与备份</Link></Button>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card/80 p-4 shadow-card">
              <f.icon className="mb-3 size-5 text-primary" />
              <p className="font-medium">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          当前资料保存在这台设备的浏览器中。请定期导出 JSON 备份；更换浏览器或清除网站数据前，先保存备份。本工具只保存你填写的链接与核实记录，不提供视频下载。
        </p>
      </main>
    </div>
  );
}
