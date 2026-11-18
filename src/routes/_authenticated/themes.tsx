import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/states";

export const Route = createFileRoute("/_authenticated/themes")({

  head: () => ({ meta: [{ title: "主题对照 · 动画课堂 ClipLab" }, { name: "description", content: "主题对照" }, { property: "og:title", content: "主题对照 · ClipLab" }, { property: "og:description", content: "主题对照" }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="主题对照" />
      <EmptyState title="该页面将在下一版完善" description="数据库与表单已就绪，可通过顶部「快速新增」先录入数据。" />
    </div>
  );
}
