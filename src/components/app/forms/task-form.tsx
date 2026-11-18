import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SimpleSelect } from "../form-bits";
import { FormDialog, emptyToNull } from "./form-dialog";
import { episodeLabel, useAllData, useDb, type ActionTask } from "@/lib/db";
import { PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/lib/constants";

export type TaskDefaults = Partial<
  Pick<ActionTask, "title" | "task_type" | "animation_id" | "episode_id" | "clip_id" | "lesson_id" | "priority" | "notes">
>;

export function TaskForm({
  record,
  defaults,
  open,
  onOpenChange,
}: {
  record?: ActionTask | null;
  defaults?: TaskDefaults;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const data = useAllData();
  const db = useDb();
  const src = record ?? defaults ?? {};
  const [v, setV] = useState({
    title: src.title ?? "",
    task_type: src.task_type ?? "其他",
    priority: src.priority ?? "中",
    status: record?.status ?? "待处理",
    due_date: record?.due_date ?? "",
    animation_id: src.animation_id ?? null,
    episode_id: src.episode_id ?? null,
    clip_id: src.clip_id ?? null,
    lesson_id: src.lesson_id ?? null,
    notes: src.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof v>) => setV((p) => ({ ...p, ...patch }));
  const episodes = (v.animation_id ? data.episodesByAnimation.get(v.animation_id) : data.episodes) ?? [];

  const submit = async () => {
    if (!v.title.trim()) return setErr("请填写任务标题");
    setErr(null);
    setBusy(true);
    try {
      const payload = {
        title: v.title.trim(),
        task_type: v.task_type,
        priority: v.priority,
        status: v.status,
        due_date: v.due_date || null,
        animation_id: v.animation_id,
        episode_id: v.episode_id,
        clip_id: v.clip_id,
        lesson_id: v.lesson_id,
        notes: emptyToNull(v.notes),
      };
      if (record) await db.update("action_tasks", record.id, payload);
      else await db.insert("action_tasks", payload);
      toast.success(record ? "行动已更新" : "已创建备课行动");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={record ? "编辑备课行动" : "新建备课行动"} onSubmit={submit} busy={busy}>
      <Field label="任务标题" htmlFor="tk-title" required error={err}>
        <Input id="tk-title" value={v.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="类型">
          <SimpleSelect value={v.task_type} onChange={(x) => set({ task_type: x ?? "其他" })} options={TASK_TYPES} ariaLabel="任务类型" />
        </Field>
        <Field label="优先级">
          <SimpleSelect value={v.priority} onChange={(x) => set({ priority: x ?? "中" })} options={PRIORITIES} ariaLabel="优先级" />
        </Field>
        <Field label="状态">
          <SimpleSelect value={v.status} onChange={(x) => set({ status: x ?? "待处理" })} options={TASK_STATUSES} ariaLabel="状态" />
        </Field>
        <Field label="截止日期" htmlFor="tk-due">
          <Input id="tk-due" type="date" value={v.due_date} onChange={(e) => set({ due_date: e.target.value })} />
        </Field>
        <Field label="关联动画">
          <SimpleSelect
            value={v.animation_id}
            onChange={(x) => set({ animation_id: x, episode_id: null })}
            options={data.animations.map((a) => ({ value: a.id, label: a.name }))}
            noneLabel="不关联"
            ariaLabel="关联动画"
          />
        </Field>
        <Field label="关联集数">
          <SimpleSelect
            value={v.episode_id}
            onChange={(x) => set({ episode_id: x })}
            options={episodes.map((ep) => ({ value: ep.id, label: `${data.animationById.get(ep.animation_id)?.name ?? ""} ${episodeLabel(ep)}` }))}
            noneLabel="不关联"
            ariaLabel="关联集数"
          />
        </Field>
        <Field label="关联片段">
          <SimpleSelect
            value={v.clip_id}
            onChange={(x) => set({ clip_id: x })}
            options={data.clips.map((c) => ({ value: c.id, label: c.name }))}
            noneLabel="不关联"
            ariaLabel="关联片段"
          />
        </Field>
        <Field label="关联课堂方案">
          <SimpleSelect
            value={v.lesson_id}
            onChange={(x) => set({ lesson_id: x })}
            options={data.lessonPlans.map((l) => ({ value: l.id, label: l.title }))}
            noneLabel="不关联"
            ariaLabel="关联课堂方案"
          />
        </Field>
      </div>
      <Field label="备注" htmlFor="tk-notes">
        <Textarea id="tk-notes" rows={3} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </FormDialog>
  );
}
