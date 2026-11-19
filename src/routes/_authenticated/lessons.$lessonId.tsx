import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Clock3, Eye, FileText, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, InfoRow } from "@/components/app/states";
import { ThemeChips } from "@/components/app/tone-badge";
import { LessonItemFormDialog } from "@/components/app/forms/lesson-item-form";
import { useForms } from "@/components/app/forms-context";
import { useConfirm } from "@/components/app/confirm-context";
import { useDeleteActions } from "@/components/app/delete-actions";
import {
  clipSeconds,
  episodeLabel,
  useAllData,
  useDb,
  type LessonItem,
} from "@/lib/db";
import { STAGES, STAGE_HINTS, type Stage } from "@/lib/constants";
import { describeLessonTime, summarizeLesson } from "@/lib/lesson";
import { formatDuration, formatMinutes, formatTimecode } from "@/lib/time";

type LessonSearch = { mode?: "edit" | "preview" };

export const Route = createFileRoute("/_authenticated/lessons/$lessonId")({
  validateSearch: (search: Record<string, unknown>): LessonSearch => ({
    mode: search.mode === "preview" ? "preview" : "edit",
  }),
  head: () => ({
    meta: [
      { title: "课堂方案 · 动画课堂 ClipLab" },
      { name: "description", content: "编辑和预览五阶段课堂流程" },
      { property: "og:title", content: "课堂方案 · ClipLab" },
      { property: "og:description", content: "编辑和预览五阶段课堂流程" },
    ],
  }),
  component: LessonPlanDetail,
});

function LessonPlanDetail() {
  const { lessonId } = Route.useParams();
  const search = Route.useSearch();
  const isPreview = search.mode === "preview";
  const data = useAllData();
  const db = useDb();
  const forms = useForms();
  const confirm = useConfirm();
  const deleteActions = useDeleteActions();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<{ stage: Stage; record?: LessonItem } | null>(null);

  const lesson = data.lessonById.get(lessonId);
  const items = useMemo(
    () => [...(data.itemsByLesson.get(lessonId) ?? [])].sort((a, b) => {
      const stageDifference = STAGES.indexOf(a.stage as Stage) - STAGES.indexOf(b.stage as Stage);
      return stageDifference || a.position - b.position || a.created_at.localeCompare(b.created_at);
    }),
    [data.itemsByLesson, lessonId],
  );
  const summary = summarizeLesson(items, lesson?.total_minutes ?? 40);

  const openAdd = (stage: Stage) => setDialog({ stage });
  const openEdit = (item: LessonItem) => setDialog({ stage: item.stage as Stage, record: item });
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const moveItem = async (item: LessonItem, direction: -1 | 1) => {
    const siblings = items.filter((candidate) => candidate.stage === item.stage);
    const index = siblings.findIndex((candidate) => candidate.id === item.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return;
    const reordered = [...siblings];
    const [moving] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moving);
    try {
      await Promise.all(reordered.map((entry, position) =>
        db.update("lesson_items", entry.id, { position }),
      ));
      toast.success("环节顺序已调整");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const deleteItem = (item: LessonItem) => {
    confirm({
      title: "删除这个课堂环节？",
      description: "只会删除当前课堂方案中的环节，不会删除片段库里的原始片段。",
      confirmLabel: "删除环节",
      onConfirm: async () => {
        try {
          await db.remove("lesson_items", item.id);
          toast.success("课堂环节已删除");
        } catch (error) {
          toast.error((error as Error).message);
          throw error;
        }
      },
    });
  };

  if (!lesson) {
    return (
      <EmptyState
        title="没有找到这份课堂方案"
        description="它可能已被删除，或者当前浏览器尚未载入对应的本地数据。"
        action={<Button asChild variant="outline"><Link to="/lessons"><ArrowLeft className="size-4" />返回课堂流程</Link></Button>}
      />
    );
  }

  const stageItems = (stage: Stage) => items.filter((item) => item.stage === stage);
  const stageMinutes = (stage: Stage) => summary.byStage[stage];

  return (
    <div className="space-y-6">
      <PageHeader
        title={lesson.title}
        description={isPreview ? "课堂流程预览 · 可打印的教师授课流程稿" : "按五个教学阶段组织片段、提问、讨论和教师总结。"}
        actions={
          isPreview ? (
            <>
              <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />打印流程稿</Button>
              <Button asChild><Link to="/lessons/$lessonId" params={{ lessonId }} search={{ mode: "edit" }}><Pencil className="size-4" />返回编排</Link></Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline"><Link to="/lessons"><ArrowLeft className="size-4" />课堂方案列表</Link></Button>
              <Button variant="outline" onClick={() => forms.openLesson(lesson)}><Pencil className="size-4" />方案信息</Button>
              <Button asChild><Link to="/lessons/$lessonId" params={{ lessonId }} search={{ mode: "preview" }}><Eye className="size-4" />课堂预览</Link></Button>
              <Button variant="ghost" size="icon" aria-label="删除课堂方案" onClick={() => deleteActions.lesson(lesson, () => navigate({ to: "/lessons" }))}><Trash2 className="size-4 text-destructive" /></Button>
            </>
          )
        }
      />

      <section className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {lesson.theme && <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">{lesson.theme}</span>}
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{lesson.grade}</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{lesson.total_minutes} 分钟课时</span>
            </div>
            {lesson.objectives && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">教学目标</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{lesson.objectives}</p>
              </div>
            )}
            {lesson.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">方案备注</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{lesson.notes}</p>
              </div>
            )}
            {!lesson.objectives && !lesson.notes && (
              <p className="text-sm text-muted-foreground">可以在「方案信息」中补充教学目标与备注。</p>
            )}
          </div>
          <div className="min-w-[180px] rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" />全课预计用时</div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {summary.used}<span className="ml-1 text-sm font-normal text-muted-foreground">/ {lesson.total_minutes} 分钟</span>
            </p>
            <p className={"mt-1 text-xs font-medium " + (summary.state === "over" ? "text-destructive" : summary.state === "exact" ? "text-success" : "text-muted-foreground")}>
              {describeLessonTime(summary)}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
              <div
                className={"h-full rounded-full " + (summary.state === "over" ? "bg-destructive" : "bg-primary")}
                style={{ width: summary.percent + "%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {summary.state === "over" && !isPreview && (
        <div className="rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          当前流程已超出课时 {Math.abs(summary.remaining)} 分钟。可以缩短环节，或在方案信息中调整课时总长。
        </div>
      )}
      {summary.state === "under" && !isPreview && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          还有 {summary.remaining} 分钟尚未安排。可以留作课堂机动时间，也可以继续补充讨论或总结环节。
        </div>
      )}

      <div className="space-y-4">
        {STAGES.map((stage, stageIndex) => {
          const currentItems = stageItems(stage);
          return (
            <section key={stage} className="overflow-hidden rounded-xl border bg-card shadow-card print:break-inside-avoid">
              <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">{stageIndex + 1}</span>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-semibold text-foreground">{stage}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{STAGE_HINTS[stage]}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs tabular-nums text-muted-foreground">{currentItems.length} 个环节 · {stageMinutes(stage)} 分钟</span>
                  {!isPreview && (
                    <Button size="sm" variant="outline" onClick={() => openAdd(stage)}><Plus className="size-3.5" />添加环节</Button>
                  )}
                </div>
              </div>

              {currentItems.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                  {isPreview ? "本阶段暂无安排" : "本阶段还没有安排内容，可添加片段、提问、讨论或教师总结。"}
                </div>
              ) : (
                <div className="divide-y">
                  {currentItems.map((item, index) => (
                    <LessonItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      count={currentItems.length}
                      preview={isPreview}
                      data={data}
                      onEdit={() => openEdit(item)}
                      onDelete={() => deleteItem(item)}
                      onMove={(direction) => void moveItem(item, direction)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {isPreview && (
        <div className="rounded-xl border bg-card p-4 text-sm print:break-inside-avoid">
          <h2 className="mb-2 font-display font-semibold">课时安排汇总</h2>
          <div className="grid gap-2 sm:grid-cols-5">
            {STAGES.map((stage, index) => (
              <div key={stage} className="rounded-md bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">{index + 1}. {stage}</p>
                <p className="mt-1 font-semibold tabular-nums">{summary.byStage[stage]} 分钟</p>
              </div>
            ))}
          </div>
          <p className="mt-3 font-medium">全课：{summary.used} / {summary.total} 分钟 · {describeLessonTime(summary)}</p>
        </div>
      )}

      {dialog && (
        <LessonItemFormDialog
          key={dialog.record?.id ?? "new-" + dialog.stage}
          lessonId={lessonId}
          record={dialog.record}
          initialStage={dialog.stage}
          open
          onOpenChange={closeDialog}
        />
      )}
    </div>
  );
}

function LessonItemCard({
  item,
  index,
  count,
  preview,
  data,
  onEdit,
  onDelete,
  onMove,
}: {
  item: LessonItem;
  index: number;
  count: number;
  preview: boolean;
  data: ReturnType<typeof useAllData>;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const clip = item.clip_id ? data.clipById.get(item.clip_id) : undefined;
  const animation = clip ? data.animationById.get(clip.animation_id) : undefined;
  const episode = clip?.episode_id ? data.episodeById.get(clip.episode_id) : undefined;
  const title = item.title || clip?.name || "未命名环节";

  return (
    <article className="flex gap-3 px-4 py-4 sm:px-5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium text-foreground">{title}</h3>
            {clip ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                <Film className="size-3.5" />
                {animation ? <Link to="/animations/$animationId" params={{ animationId: animation.id }} className="hover:text-primary">{animation.name}</Link> : "动画未关联"}
                <span>·</span>
                {episode ? <Link to="/episodes/$episodeId" params={{ episodeId: episode.id }} className="hover:text-primary">{episodeLabel(episode)}</Link> : "未指定集数"}
                <span>·</span>
                <span>{formatTimecode(clip.start_seconds) || "未设开始"} – {formatTimecode(clip.end_seconds) || "未设结束"}</span>
                <span>·</span>
                <span>片段 {formatDuration(clipSeconds(clip))}</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">独立教学环节 · 未关联片段</p>
            )}
          </div>
          <span className="shrink-0 rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-primary">{item.minutes} 分钟</span>
        </div>

        <ThemeChips themes={item.themes} max={6} />
        <DetailText label="教师提问" value={item.questions} />
        <DetailText label="讨论活动 / 讨论目标" value={item.discussion} />
        <DetailText label="教师总结" value={item.summary} />

        {!preview && (
          <div className="flex flex-wrap items-center justify-end gap-1 border-t pt-2">
            <Button variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => onMove(-1)} aria-label="上移环节"><ArrowUp className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="size-8" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="下移环节"><ArrowDown className="size-4" /></Button>
            <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="size-3.5" />编辑</Button>
            <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="size-3.5 text-destructive" />删除</Button>
          </div>
        )}
      </div>
    </article>
  );
}

function DetailText({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}
