import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FormGroup, SimpleSelect, ThemeInput } from "@/components/app/form-bits";
import { useAllData, useDb, episodeLabel, clipSeconds, type LessonItem } from "@/lib/db";
import { STAGES, type Stage } from "@/lib/constants";
import { formatDuration, formatTimecode } from "@/lib/time";

type FormValues = {
  title: string;
  clip_id: string | null;
  stage: Stage;
  minutes: string;
  themes: string[];
  questions: string;
  discussion: string;
  summary: string;
};

export function LessonItemFormDialog({
  lessonId,
  record,
  initialStage,
  open,
  onOpenChange,
}: {
  lessonId: string;
  record?: LessonItem | null;
  initialStage: Stage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useAllData();
  const db = useDb();
  const initialClip = record?.clip_id ? data.clipById.get(record.clip_id) : undefined;
  const [values, setValues] = useState<FormValues>(() => ({
    title: record?.title ?? initialClip?.name ?? "",
    clip_id: record?.clip_id ?? null,
    stage: (record?.stage as Stage | undefined) ?? initialStage,
    minutes: String(record?.minutes ?? initialClip?.est_class_minutes ?? initialClip?.play_minutes ?? 5),
    themes: record?.themes?.length ? record.themes : initialClip?.themes ?? [],
    questions: record?.questions ?? initialClip?.questions ?? "",
    discussion: record?.discussion ?? initialClip?.discussion_goal ?? "",
    summary: record?.summary ?? initialClip?.summary ?? "",
  }));
  const [manualFields, setManualFields] = useState<Set<keyof FormValues>>(() => record
    ? new Set(["title", "minutes", "themes", "questions", "discussion", "summary"])
    : new Set());
  const changeValue = <K extends keyof FormValues,>(key: K, value: FormValues[K]) => {
    setManualFields((previous) => new Set(previous).add(key));
    setValues((current) => ({ ...current, [key]: value }));
  };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const clipOptions = useMemo(
    () => data.clips.map((clip) => {
      const animation = data.animationById.get(clip.animation_id);
      const episode = clip.episode_id ? data.episodeById.get(clip.episode_id) : undefined;
      return {
        value: clip.id,
        label: clip.name + " · " + (animation?.name ?? "未知动画") + " · " + episodeLabel(episode),
      };
    }).sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
    [data.clips, data.animationById, data.episodeById],
  );

  const selectClip = (clipId: string | null) => {
    if (!clipId) {
      setValues((current) => ({ ...current, clip_id: null }));
      return;
    }
    const clip = data.clipById.get(clipId);
    if (!clip) return;
    setValues((current) => ({
      ...current,
      clip_id: clipId,
      title: manualFields.has("title") ? current.title : clip.name,
      themes: manualFields.has("themes") ? current.themes : clip.themes,
      questions: manualFields.has("questions") ? current.questions : clip.questions ?? "",
      discussion: manualFields.has("discussion") ? current.discussion : clip.discussion_goal ?? "",
      summary: manualFields.has("summary") ? current.summary : clip.summary ?? "",
      minutes: manualFields.has("minutes")
        ? current.minutes
        : String(clip.est_class_minutes ?? clip.play_minutes ?? 5),
    }));
  };

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    const minutes = Number(values.minutes);
    if (!values.title.trim() && !values.clip_id) nextErrors.title = "请填写环节名称或关联一个片段";
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
      nextErrors.minutes = "请输入大于 0 且不超过 600 的分钟数";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const siblings = (data.itemsByLesson.get(lessonId) ?? []).filter(
      (item) => item.stage === values.stage && item.id !== record?.id,
    );
    const position = record?.stage === values.stage
      ? record.position
      : siblings.reduce((max, item) => Math.max(max, item.position), -1) + 1;
    const payload = {
      lesson_id: lessonId,
      clip_id: values.clip_id,
      title: values.title.trim() || null,
      stage: values.stage,
      minutes,
      position,
      themes: values.themes,
      questions: values.questions.trim() || null,
      discussion: values.discussion.trim() || null,
      summary: values.summary.trim() || null,
    };

    setBusy(true);
    try {
      if (record) {
        await db.update("lesson_items", record.id, payload);
        toast.success("课堂环节已更新");
      } else {
        await db.insert("lesson_items", payload);
        toast.success("已添加课堂环节");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const linkedClip = values.clip_id ? data.clipById.get(values.clip_id) : undefined;
  const linkedEpisode = linkedClip?.episode_id ? data.episodeById.get(linkedClip.episode_id) : undefined;
  const linkedAnimation = linkedClip ? data.animationById.get(linkedClip.animation_id) : undefined;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">{record ? "编辑课堂环节" : "添加课堂环节"}</DialogTitle>
            <DialogDescription>
              可关联片段并带入原有教学信息；此处的修改只作用于当前课堂方案，不会改动片段库。
            </DialogDescription>
          </DialogHeader>

          <FormGroup title="环节安排">
            <Field label="所属阶段" htmlFor="lesson-item-stage" required>
              <SimpleSelect
                id="lesson-item-stage"
                value={values.stage}
                onChange={(value) => value && changeValue("stage", value as Stage)}
                options={STAGES}
              />
            </Field>
            <Field label="关联片段" htmlFor="lesson-item-clip" hint="不关联片段也可以添加纯提问、讨论或教师总结环节。">
              <SimpleSelect
                id="lesson-item-clip"
                value={values.clip_id}
                onChange={selectClip}
                options={clipOptions}
                noneLabel="不关联片段"
                placeholder="从片段库选择"
              />
            </Field>
            {linkedClip && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <Film className="size-3.5" />{linkedAnimation?.name ?? "未知动画"} · {episodeLabel(linkedEpisode)}
                </p>
                <p className="mt-1">
                  片段时间：{formatTimecode(linkedClip.start_seconds) || "未设开始"} – {formatTimecode(linkedClip.end_seconds) || "未设结束"}
                  {" · "}原始片段时长 {formatDuration(clipSeconds(linkedClip))}
                </p>
                <p className="mt-1">以下教学文字会复制到当前课堂环节，后续可独立修改。</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <Field label="环节名称" htmlFor="lesson-item-title" error={errors.title}>
                <Input
                  id="lesson-item-title"
                  value={values.title}
                  onChange={(event) => changeValue("title", event.target.value)}
                  placeholder="例如：观看片段并发现冲突"
                />
              </Field>
              <Field label="预计用时（分钟）" htmlFor="lesson-item-minutes" error={errors.minutes}>
                <Input
                  id="lesson-item-minutes"
                  type="number"
                  min="0.1"
                  max="600"
                  step="0.5"
                  inputMode="decimal"
                  value={values.minutes}
                  onChange={(event) => changeValue("minutes", event.target.value)}
                />
              </Field>
            </div>
            <Field label="主题标签">
              <ThemeInput
                value={values.themes}
                onChange={(themes) => changeValue("themes", themes)}
                suggestions={data.clips.flatMap((clip) => clip.themes)}
              />
            </Field>
          </FormGroup>

          <FormGroup title="本课教学内容" description="这些内容属于当前课堂方案，可按本班学生情况调整。">
            <Field label="教师提问" htmlFor="lesson-item-questions">
              <Textarea
                id="lesson-item-questions"
                rows={3}
                value={values.questions}
                onChange={(event) => changeValue("questions", event.target.value)}
                placeholder="引导学生观察、思考的问题"
              />
            </Field>
            <Field label="讨论活动 / 讨论目标" htmlFor="lesson-item-discussion">
              <Textarea
                id="lesson-item-discussion"
                rows={3}
                value={values.discussion}
                onChange={(event) => changeValue("discussion", event.target.value)}
                placeholder="学生要讨论什么、达成什么理解"
              />
            </Field>
            <Field label="教师总结" htmlFor="lesson-item-summary">
              <Textarea
                id="lesson-item-summary"
                rows={3}
                value={values.summary}
                onChange={(event) => changeValue("summary", event.target.value)}
                placeholder="本环节希望学生带走的结论"
              />
            </Field>
          </FormGroup>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>取消</Button>
            <Button type="submit" disabled={busy}>
              <BookOpen className="size-4" />{busy ? "保存中…" : record ? "保存修改" : "添加到课堂流程"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
