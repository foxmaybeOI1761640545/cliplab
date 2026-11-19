import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Clock3, FilePlus2, Layers3, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/app/states";
import { useForms } from "@/components/app/forms-context";
import { useDeleteActions } from "@/components/app/delete-actions";
import { useAllData, type LessonPlan } from "@/lib/db";
import { STAGES } from "@/lib/constants";
import { describeLessonTime, summarizeLesson } from "@/lib/lesson";

export const Route = createFileRoute("/_authenticated/lessons/")({
  head: () => ({
    meta: [
      { title: "课堂流程 · 动画课堂 ClipLab" },
      { name: "description", content: "编排五阶段课堂流程，管理教学目标与课时安排" },
      { property: "og:title", content: "课堂流程 · ClipLab" },
      { property: "og:description", content: "编排五阶段课堂流程，管理教学目标与课时安排" },
    ],
  }),
  component: LessonPlansPage,
});

function LessonPlansPage() {
  const data = useAllData();
  const forms = useForms();
  const deleteActions = useDeleteActions();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return data.lessonPlans.filter((lesson) => {
      if (!term) return true;
      return [lesson.title, lesson.theme, lesson.grade, lesson.objectives, lesson.notes]
        .some((value) => (value ?? "").toLocaleLowerCase().includes(term));
    });
  }, [data.lessonPlans, query]);

  const totalItems = data.lessonItems.length;
  const completedPlans = data.lessonPlans.filter((lesson) => {
    const items = data.itemsByLesson.get(lesson.id) ?? [];
    return items.length > 0 && summarizeLesson(items, lesson.total_minutes).state === "exact";
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="课堂流程"
        description="把片段库中的素材编排成一节完整的课。按五个教学阶段安排内容，并随时检查课时是否超出 40 分钟。"
        actions={<Button onClick={() => forms.openLesson()}><Plus className="size-4" />新建课堂方案</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="课堂方案" value={data.lessonPlans.length} icon={<BookOpen className="size-4" />} />
        <Stat label="已编排环节" value={totalItems} icon={<Layers3 className="size-4" />} />
        <Stat label="刚好用满课时" value={completedPlans} icon={<Clock3 className="size-4" />} />
      </div>

      {data.lessonPlans.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索方案标题、主题、年级或教学目标…"
            className="pl-9"
            aria-label="搜索课堂方案"
          />
        </div>
      )}

      {data.lessonPlans.length === 0 ? (
        <EmptyState
          icon={<FilePlus2 className="size-5" />}
          title="还没有课堂方案"
          description="创建一个课堂方案，默认七年级、40 分钟。随后把片段库中的素材分配到五个教学阶段。"
          action={<Button onClick={() => forms.openLesson()}><Plus className="size-4" />创建第一份课堂方案</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="没有找到符合条件的方案" description="试试其他关键词，或清空搜索框。" />
      ) : (
        <div className="performance-list grid gap-4 xl:grid-cols-2">
          {filtered.map((lesson) => {
            const items = data.itemsByLesson.get(lesson.id) ?? [];
            const summary = summarizeLesson(items, lesson.total_minutes);
            return (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                itemCount={items.length}
                used={summary.used}
                timeLabel={describeLessonTime(summary)}
                timeState={summary.state}
                stageMinutes={summary.byStage}
                onEdit={() => forms.openLesson(lesson)}
                onDelete={() => deleteActions.lesson(lesson)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function LessonCard({
  lesson,
  itemCount,
  used,
  timeLabel,
  timeState,
  stageMinutes,
  onEdit,
  onDelete,
}: {
  lesson: LessonPlan;
  itemCount: number;
  used: number;
  timeLabel: string;
  timeState: "over" | "exact" | "under";
  stageMinutes: Record<(typeof STAGES)[number], number>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const percentage = lesson.total_minutes > 0 ? Math.min(100, Math.round((used / lesson.total_minutes) * 100)) : 0;
  const tone = timeState === "over" ? "text-destructive" : timeState === "exact" ? "text-success" : "text-muted-foreground";

  return (
    <article className="space-y-4 rounded-xl border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-foreground">{lesson.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {[lesson.theme, lesson.grade].filter(Boolean).join(" · ") || "尚未设置主题"}
            {" · "}{lesson.total_minutes} 分钟
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-primary">{itemCount} 个环节</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">课时安排</span>
          <span className={"font-medium " + tone}>{used} / {lesson.total_minutes} 分钟 · {timeLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={"h-full rounded-full transition-all " + (timeState === "over" ? "bg-destructive" : "bg-primary")}
            style={{ width: percentage + "%" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {STAGES.map((stage, index) => (
          <div key={stage} className="min-w-0 rounded-md bg-muted/60 px-1.5 py-2 text-center">
            <p className="truncate text-[10px] text-muted-foreground">{index + 1}. {stage}</p>
            <p className="mt-1 text-xs font-semibold tabular-nums text-foreground">{stageMinutes[stage]} 分</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-[11px] text-muted-foreground">最近更新：{new Date(lesson.updated_at).toLocaleDateString("zh-CN")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="size-3.5" />方案信息</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label={"删除" + lesson.title}><Trash2 className="size-3.5 text-destructive" /></Button>
          <Button asChild size="sm">
            <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} search={{ mode: "edit" }}>编排课堂</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
