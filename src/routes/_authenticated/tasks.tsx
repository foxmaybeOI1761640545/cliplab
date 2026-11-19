import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, CircleAlert, ListTodo, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/app/form-bits";
import { PageHeader, EmptyState, Section } from "@/components/app/states";
import { useForms } from "@/components/app/forms-context";
import { useDeleteActions } from "@/components/app/delete-actions";
import { DemoBadge, PriorityBadge, TaskStatusBadge, ToneBadge } from "@/components/app/tone-badge";
import { useAllData, useDb, todayISO, episodeLabel, type ActionTask, type AllData } from "@/lib/db";
import { PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { buildPrepSuggestions, type PrepSuggestion } from "@/lib/prep-suggestions";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "备课行动 · 动画课堂 ClipLab" },
      { name: "description", content: "整理备课待办、核实资源并跟进课堂准备进度" },
      { property: "og:title", content: "备课行动 · ClipLab" },
      { property: "og:description", content: "整理备课待办、核实资源并跟进课堂准备进度" },
    ],
  }),
  component: PrepActionsPage,
});

type DemoFilter = "全部" | "真实数据" | "DEMO";

function PrepActionsPage() {
  const data = useAllData();
  const db = useDb();
  const forms = useForms();
  const deleteActions = useDeleteActions();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [priorityFilter, setPriorityFilter] = useState("全部");
  const [demoFilter, setDemoFilter] = useState<DemoFilter>("真实数据");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const today = todayISO();

  const realTasks = data.tasks.filter((task) => !task.is_demo);
  const suggestions = useMemo(() => buildPrepSuggestions(data), [data]);
  const untrackedSuggestions = suggestions.filter((item) => !item.alreadyTracked);
  const trackedSuggestionCount = suggestions.length - untrackedSuggestions.length;
  const overdueCount = realTasks.filter((task) =>
    task.status !== "已完成" && task.status !== "暂缓" && task.due_date && task.due_date < today,
  ).length;
  const pendingCount = realTasks.filter((task) => task.status === "待处理").length;
  const inProgressCount = realTasks.filter((task) => task.status === "进行中").length;
  const completedCount = realTasks.filter((task) => task.status === "已完成").length;

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return data.tasks.filter((task) => {
      if (demoFilter === "真实数据" && task.is_demo) return false;
      if (demoFilter === "DEMO" && !task.is_demo) return false;
      if (statusFilter !== "全部" && task.status !== statusFilter) return false;
      if (priorityFilter !== "全部" && task.priority !== priorityFilter) return false;
      if (!term) return true;
      const related = taskContext(task, data);
      return [task.title, task.task_type, task.notes, related].filter(Boolean).join(" ").toLocaleLowerCase().includes(term);
    }).sort((a, b) => {
      const rank = { 高: 0, 中: 1, 低: 2 };
      return (rank[a.priority as keyof typeof rank] ?? 1) - (rank[b.priority as keyof typeof rank] ?? 1) ||
        (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31") ||
        b.updated_at.localeCompare(a.updated_at);
    });
  }, [data, query, statusFilter, priorityFilter, demoFilter]);

  const updateStatus = async (task: ActionTask, status: string) => {
    setUpdatingId(task.id);
    try {
      await db.update("action_tasks", task.id, { status });
      toast.success(status === "已完成" ? "行动已完成" : "行动状态已更新");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="备课行动"
        description="把资料缺口、片段剪辑、时间码、提问设计和课堂流程转成可以逐项完成的行动。系统只生成建议，不会未经确认自动创建任务。"
        actions={<Button onClick={() => forms.openTask()}><Plus className="size-4" />新建行动</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="待处理" value={pendingCount} icon={<ListTodo className="size-4" />} />
        <Stat label="进行中" value={inProgressCount} icon={<CalendarClock className="size-4" />} />
        <Stat label="已完成" value={completedCount} icon={<CheckCircle2 className="size-4" />} />
        <Stat label="已逾期" value={overdueCount} icon={<CircleAlert className="size-4" />} danger={overdueCount > 0} />
      </div>

      <Section
        title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />下一步备课建议</span>}
        action={<div className="flex items-center gap-2">
          <ToneBadge tone={untrackedSuggestions.length ? "warning" : "success"}>{untrackedSuggestions.length} 项待加入</ToneBadge>
          {untrackedSuggestions.length > 12 && <Button size="sm" variant="ghost" onClick={() => setShowAllSuggestions((value) => !value)}>{showAllSuggestions ? "收起" : "显示全部"}</Button>}
        </div>}
      >
        <p className="mb-3 text-xs leading-5 text-muted-foreground">
          建议根据真实数据自动整理；DEMO 记录不会生成真实备课任务。你确认后才会写入行动列表，已有进行中的行动不会重复添加。
        </p>
        {untrackedSuggestions.length === 0 ? (
          <div className="rounded-lg bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
            暂无新的备课建议。{trackedSuggestionCount ? "已有 " + trackedSuggestionCount + " 项建议对应现有行动。" : "可以继续完善片段、资源和课堂方案。"}
          </div>
        ) : (
          <div className="grid gap-2 xl:grid-cols-2">
            {untrackedSuggestions.slice(0, showAllSuggestions ? untrackedSuggestions.length : 12).map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAdd={() => forms.openTask(undefined, suggestion)}
              />
            ))}
          </div>
        )}
        {untrackedSuggestions.length > 12 && !showAllSuggestions && (
          <p className="mt-3 text-xs text-muted-foreground">当前先显示前 12 项，可点击「显示全部」查看其余建议。</p>
        )}
      </Section>

      <Section title="行动列表" action={<span className="text-xs text-muted-foreground">显示 {filtered.length} 项</span>}>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="搜索行动、类型或关联对象…" aria-label="搜索备课行动" />
          </div>
          <SimpleSelect value={statusFilter} onChange={(value) => setStatusFilter(value ?? "全部")} options={["全部", ...TASK_STATUSES]} ariaLabel="按行动状态筛选" />
          <SimpleSelect value={priorityFilter} onChange={(value) => setPriorityFilter(value ?? "全部")} options={["全部", ...PRIORITIES]} ariaLabel="按优先级筛选" />
          <SimpleSelect value={demoFilter} onChange={(value) => setDemoFilter((value as DemoFilter) ?? "全部")} options={["全部", "真实数据", "DEMO"]} ariaLabel="按数据类型筛选" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="还没有符合条件的行动"
            description={data.tasks.length ? "调整筛选条件，或从上方备课建议中添加行动。" : "可以手动新建行动，也可以从上方建议中选择要做的工作。"}
            action={<Button onClick={() => forms.openTask()}><Plus className="size-4" />新建行动</Button>}
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                data={data}
                today={today}
                busy={updatingId === task.id}
                onStatusChange={(status) => void updateStatus(task, status)}
                onEdit={() => forms.openTask(task)}
                onDelete={() => deleteActions.task(task)}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, icon, danger }: { label: string; value: number; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <p className={"mt-2 text-2xl font-semibold tabular-nums " + (danger ? "text-destructive" : "text-foreground")}>{value}</p>
    </div>
  );
}

function SuggestionCard({ suggestion, onAdd }: { suggestion: PrepSuggestion; onAdd: () => void }) {
  return (
    <article className="flex min-w-0 items-start justify-between gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge value={suggestion.priority} />
          <ToneBadge tone="neutral">{suggestion.task_type}</ToneBadge>
        </div>
        <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
        <p className="text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0" onClick={onAdd}><Plus className="size-3.5" />加入</Button>
    </article>
  );
}

function taskContext(task: ActionTask, data: AllData) {
  const animation = task.animation_id ? data.animationById.get(task.animation_id) : undefined;
  const episode = task.episode_id ? data.episodeById.get(task.episode_id) : undefined;
  const clip = task.clip_id ? data.clipById.get(task.clip_id) : undefined;
  const lesson = task.lesson_id ? data.lessonById.get(task.lesson_id) : undefined;
  return [animation?.name, episode ? episodeLabel(episode) : null, clip?.name, lesson?.title].filter(Boolean).join(" · ");
}

function TaskCard({
  task,
  data,
  today,
  busy,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: ActionTask;
  data: AllData;
  today: string;
  busy: boolean;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const animation = task.animation_id ? data.animationById.get(task.animation_id) : undefined;
  const episode = task.episode_id ? data.episodeById.get(task.episode_id) : undefined;
  const clip = task.clip_id ? data.clipById.get(task.clip_id) : undefined;
  const lesson = task.lesson_id ? data.lessonById.get(task.lesson_id) : undefined;
  const overdue = task.status !== "已完成" && task.status !== "暂缓" && Boolean(task.due_date && task.due_date < today);
  const dueToday = task.due_date === today;

  return (
    <article className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{task.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{task.task_type}</p>
        </div>
        <DemoBadge show={task.is_demo} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <PriorityBadge value={task.priority} />
        <TaskStatusBadge value={task.status} />
        {overdue && <ToneBadge tone="danger">已逾期</ToneBadge>}
        {dueToday && task.status !== "已完成" && <ToneBadge tone="warning">今天截止</ToneBadge>}
      </div>

      {task.notes && <p className="whitespace-pre-wrap text-sm leading-5 text-muted-foreground">{task.notes}</p>}

      {(animation || episode || clip || lesson) && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {animation && <Link to="/animations/$animationId" params={{ animationId: animation.id }} className="hover:text-primary">{animation.name}</Link>}
          {episode && <Link to="/episodes/$episodeId" params={{ episodeId: episode.id }} className="hover:text-primary">{episodeLabel(episode)}</Link>}
          {clip && <span>片段：{clip.name}</span>}
          {lesson && <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} search={{ mode: "edit" }} className="hover:text-primary">课堂：{lesson.title}</Link>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="text-[11px] text-muted-foreground">
          {task.due_date ? "截止：" + task.due_date : "未设置截止日期"}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <SimpleSelect
            value={task.status}
            onChange={(value) => value && onStatusChange(value)}
            options={TASK_STATUSES}
            ariaLabel={"更新行动状态：" + task.title}
            disabled={busy}
          />
          <Button size="icon" variant="ghost" className="size-8" onClick={onEdit} aria-label="编辑行动"><span className="text-sm">✎</span></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={onDelete} aria-label="删除行动"><Trash2 className="size-3.5 text-destructive" /></Button>
        </div>
      </div>
    </article>
  );
}
