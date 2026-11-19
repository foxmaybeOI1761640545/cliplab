import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormGroup, SimpleSelect, ThemeInput } from "../form-bits";
import { FormDialog, emptyToNull, numOrNull } from "./form-dialog";
import { DemoSwitchField } from "@/components/app/demo-switch-field";
import { episodeLabel, normalize, useAllData, useDb, type Clip } from "@/lib/db";
import { CLIP_SOFT_LIMIT_SECONDS, CLIP_STATUSES, DEFAULT_GRADE, GRADES, STAGES } from "@/lib/constants";
import { clipDuration, formatDuration, formatTimecode, parseTimecode, secondsToMinutes } from "@/lib/time";

export type ClipDefaults = { animation_id?: string; episode_id?: string; stage?: string };

export function ClipForm({
  record,
  defaults,
  open,
  onOpenChange,
}: {
  record?: Clip | null;
  defaults?: ClipDefaults;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const data = useAllData();
  const db = useDb();
  const [v, setV] = useState({
    is_demo: record?.is_demo ?? false,
    name: record?.name ?? "",
    animation_id: record?.animation_id ?? defaults?.animation_id ?? null,
    episode_id: record?.episode_id ?? defaults?.episode_id ?? null,
    stage: record?.stage ?? defaults?.stage ?? null,
    status: record?.status ?? "构思中",
    grade: record?.grade ?? DEFAULT_GRADE,
    start: formatTimecode(record?.start_seconds),
    end: formatTimecode(record?.end_seconds),
    play_minutes: record?.play_minutes?.toString() ?? "",
    est_class_minutes: record?.est_class_minutes?.toString() ?? "",
    themes: record?.themes ?? [],
    questions: record?.questions ?? "",
    discussion_goal: record?.discussion_goal ?? "",
    summary: record?.summary ?? "",
    highlight_notes: record?.highlight_notes ?? "",
    teaching_notes: record?.teaching_notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof v>) => setV((p) => ({ ...p, ...patch }));

  const episodes = (v.animation_id ? data.episodesByAnimation.get(v.animation_id) : []) ?? [];
  const start = parseTimecode(v.start);
  const end = parseTimecode(v.end);
  const dur = start.ok && end.ok ? clipDuration(start.seconds, end.seconds) : { seconds: null };
  const allThemes = useMemo(
    () => Array.from(new Set(data.clips.flatMap((c) => c.themes).concat(data.animations.flatMap((a) => a.theme_tags)))),
    [data.clips, data.animations],
  );

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!v.name.trim()) e.name = "请填写片段名称";
    if (!v.animation_id) e.animation_id = "请选择动画作品";
    if (!start.ok) e.start = start.error;
    if (!end.ok) e.end = end.error;
    if (dur.error) e.end = dur.error;
    const pm = numOrNull(v.play_minutes);
    const em = numOrNull(v.est_class_minutes);
    if (Number.isNaN(pm) || (pm != null && pm < 0)) e.play_minutes = "请输入不小于 0 的数字";
    if (Number.isNaN(em) || (em != null && em < 0)) e.est_class_minutes = "请输入不小于 0 的数字";
    if (!e.name && v.animation_id) {
      const dup = data.clips.find(
        (c) =>
          c.id !== record?.id &&
          c.animation_id === v.animation_id &&
          (c.episode_id ?? null) === (v.episode_id ?? null) &&
          normalize(c.name) === normalize(v.name),
      );
      if (dup) e.name = "同一集下已有同名片段";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const payload = {
        is_demo: v.is_demo,
        name: v.name.trim(),
        animation_id: v.animation_id!,
        episode_id: v.episode_id,
        stage: v.stage,
        status: v.status,
        grade: v.grade.trim() || DEFAULT_GRADE,
        start_seconds: start.ok ? start.seconds : null,
        end_seconds: end.ok ? end.seconds : null,
        play_minutes: pm as number | null,
        est_class_minutes: em as number | null,
        themes: v.themes,
        questions: emptyToNull(v.questions),
        discussion_goal: emptyToNull(v.discussion_goal),
        summary: emptyToNull(v.summary),
        highlight_notes: emptyToNull(v.highlight_notes),
        teaching_notes: emptyToNull(v.teaching_notes),
      };
      if (record) await db.update("clips", record.id, payload);
      else await db.insert("clips", payload);
      toast.success(record ? "片段已更新" : "已新增片段");
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "编辑片段" : "新增片段"}
      description="建议每个片段控制在 1–5 分钟。资源与版权请在保存后到「资源核实」登记。"
      onSubmit={submit}
      busy={busy}
      wide
    >
      <FormGroup title="基本信息">
        <Field label="片段名称" htmlFor="clip-name" required error={errors.name}>
          <Input id="clip-name" value={v.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="动画作品" required error={errors.animation_id}>
            <SimpleSelect
              value={v.animation_id}
              onChange={(x) => set({ animation_id: x, episode_id: null })}
              options={data.animations.map((a) => ({ value: a.id, label: a.name }))}
              placeholder={data.animations.length ? "选择动画作品" : "请先新增动画作品"}
              ariaLabel="动画作品"
            />
          </Field>
          <Field label="集数" hint={v.animation_id && !episodes.length ? "该动画尚未登记集数，可暂不选择" : undefined}>
            <SimpleSelect
              value={v.episode_id}
              onChange={(x) => set({ episode_id: x })}
              options={episodes.map((ep) => ({ value: ep.id, label: episodeLabel(ep) }))}
              noneLabel="暂不指定集数"
              ariaLabel="集数"
              disabled={!v.animation_id}
            />
          </Field>
          <Field label="课堂阶段">
            <SimpleSelect value={v.stage} onChange={(x) => set({ stage: x })} options={STAGES} noneLabel="暂未确定" ariaLabel="课堂阶段" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="片段状态">
              <SimpleSelect value={v.status} onChange={(x) => set({ status: x ?? "构思中" })} options={CLIP_STATUSES} ariaLabel="片段状态" />
            </Field>
            <Field label="适用年级" htmlFor="clip-grade">
              <Input id="clip-grade" list="grade-list" value={v.grade} onChange={(e) => set({ grade: e.target.value })} />
              <datalist id="grade-list">
                {GRADES.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
          </div>
        </div>
      </FormGroup>

      <FormGroup title="时间段与用时" description="支持 mm:ss 或 hh:mm:ss；暂不清楚可以留空，之后再补充。">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="开始时间" htmlFor="clip-start" error={errors.start}>
            <Input id="clip-start" className="font-timecode" value={v.start} onChange={(e) => set({ start: e.target.value })} placeholder="03:20" />
          </Field>
          <Field label="结束时间" htmlFor="clip-end" error={errors.end}>
            <Input id="clip-end" className="font-timecode" value={v.end} onChange={(e) => set({ end: e.target.value })} placeholder="06:05" />
          </Field>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">片段时长</span>
            <div className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm" aria-live="polite">
              <Clock className="size-4 text-muted-foreground" />
              <span className="font-timecode">{dur.seconds != null ? formatDuration(dur.seconds) : "待补充"}</span>
            </div>
          </div>
        </div>
        {dur.seconds != null && dur.seconds > CLIP_SOFT_LIMIT_SECONDS && (
          <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            片段超过 5 分钟，课堂上可能占用较多时间。可以考虑截取关键段落，当然也可以照常保存。
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="适合课堂播放（分钟）" htmlFor="clip-pm" error={errors.play_minutes} hint={dur.seconds != null ? `留空则按时间段计为 ${secondsToMinutes(dur.seconds)} 分钟` : undefined}>
            <Input id="clip-pm" inputMode="decimal" value={v.play_minutes} onChange={(e) => set({ play_minutes: e.target.value })} />
          </Field>
          <Field label="预计课堂用时（分钟）" htmlFor="clip-em" error={errors.est_class_minutes} hint="含播放、提问与讨论">
            <Input id="clip-em" inputMode="decimal" value={v.est_class_minutes} onChange={(e) => set({ est_class_minutes: e.target.value })} />
          </Field>
        </div>
      </FormGroup>

      <FormGroup title="主题">
        <ThemeInput value={v.themes} onChange={(t) => set({ themes: t })} suggestions={allThemes} />
      </FormGroup>

      <FormGroup title="教学设计">
        <Field label="教师提问" htmlFor="clip-q">
          <Textarea id="clip-q" rows={3} value={v.questions} onChange={(e) => set({ questions: e.target.value })} placeholder="每行一个问题" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="讨论目标" htmlFor="clip-dg">
            <Textarea id="clip-dg" rows={3} value={v.discussion_goal} onChange={(e) => set({ discussion_goal: e.target.value })} />
          </Field>
          <Field label="总结陈述" htmlFor="clip-sum">
            <Textarea id="clip-sum" rows={3} value={v.summary} onChange={(e) => set({ summary: e.target.value })} />
          </Field>
        </div>
        <Field label="重点画面 / 剪辑提示" htmlFor="clip-hl">
          <Textarea id="clip-hl" rows={2} value={v.highlight_notes} onChange={(e) => set({ highlight_notes: e.target.value })} />
        </Field>
        <Field label="教学备注" htmlFor="clip-tn">
          <Textarea id="clip-tn" rows={2} value={v.teaching_notes} onChange={(e) => set({ teaching_notes: e.target.value })} />
        </Field>
      </FormGroup>
      <DemoSwitchField checked={v.is_demo} onCheckedChange={(checked) => setV((current) => ({ ...current, is_demo: checked }))} />
    </FormDialog>
  );
}
