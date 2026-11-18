import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/states";

export const Route = createFileRoute("/_authenticated/tasks")({

  head: () => ({ meta: [{ title: "备课行动 · 动画课堂 ClipLab" }, { name: "description", content: "备课行动" }, { property: "og:title", content: "备课行动 · ClipLab" }, { property: "og:description", content: "备课行动" }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="备课行动" />
      <EmptyState title="该页面将在下一版完善" description="数据库与表单已就绪，可通过顶部「快速新增」先录入数据。" />
    </div>
  );
}
