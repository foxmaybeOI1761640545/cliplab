import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/states";

export const Route = createFileRoute("/_authenticated/clips")({
  validateSearch: (s: Record<string, unknown>): { clip?: string } => ({ clip: typeof s.clip === "string" ? s.clip : undefined }),
  head: () => ({ meta: [{ title: "片段库 · 动画课堂 ClipLab" }, { name: "description", content: "片段库" }, { property: "og:title", content: "片段库 · ClipLab" }, { property: "og:description", content: "片段库" }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="片段库" />
      <EmptyState title="该页面将在下一版完善" description="数据库与表单已就绪，可通过顶部「快速新增」先录入数据。" />
    </div>
  );
}
