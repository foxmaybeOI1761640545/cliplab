import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/states";

export const Route = createFileRoute("/_authenticated/animations/$animationId")({

  head: () => ({ meta: [{ title: "动画详情 · 动画课堂 ClipLab" }, { name: "description", content: "动画详情" }, { property: "og:title", content: "动画详情 · ClipLab" }, { property: "og:description", content: "动画详情" }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="动画详情" />
      <EmptyState title="该页面将在下一版完善" description="数据库与表单已就绪，可通过顶部「快速新增」先录入数据。" />
    </div>
  );
}
