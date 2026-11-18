import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "../form-bits";
import { FormDialog, emptyToNull } from "./form-dialog";
import { useAllData, useDb, type LessonPlan } from "@/lib/db";
import { DEFAULT_GRADE, DEFAULT_LESSON_MINUTES, GRADES, PRESET_THEMES } from "@/lib/constants";

export function LessonForm({
  record,
  open,
  onOpenChange,
}: {
  record?: LessonPlan | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const data = useAllData();
  const db = useDb();
  const navigate = useNavigate();
  const [v, setV] = useState({
    title: record?.title ?? "",
    theme: record?.theme ?? "",
    grade: record?.grade ?? DEFAULT_GRADE,
    total_minutes: String(record?.total_minutes ?? DEFAULT_LESSON_MINUTES),
    objectives: record?.objectives ?? "",
    notes: record?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const themes = Array.from(new Set([...PRESET_THEMES, ...data.clips.flatMap((c) => c.themes)]));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!v.title.trim()) e.title = "请填写课堂方案标题";
    const total = Number(v.total_minutes);
    if (!Number.isInteger(total) || total <= 0 || total > 600) e.total_minutes = "请输入 1–600 之间的整数分钟";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const payload = {
        title: v.title.trim(),
        theme: emptyToNull(v.theme),
        grade: v.grade.trim() || DEFAULT_GRADE,
        total_minutes: total,
        objectives: emptyToNull(v.objectives),
        notes: emptyToNull(v.notes),
      };
      if (record) {
        await db.update("lesson_plans", record.id, payload);
        toast.success("课堂方案信息已更新");
        onOpenChange(false);
      } else {
        const [created] = await db.insert("lesson_plans", payload);
        toast.success("已创建课堂方案，开始安排五个阶段吧");
        onOpenChange(false);
        navigate({ to: "/lessons/$lessonId", params: { lessonId: created.id }, search: { mode: "edit" } });
      }
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
      title={record ? "编辑课堂方案信息" : "新建课堂方案"}
      description="默认七年级、40 分钟，可按实际修改。"
      onSubmit={submit}
      busy={busy}
    >
      <Field label="方案标题" htmlFor="ls-title" required error={errors.title}>
        <Input id="ls-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="主题" htmlFor="ls-theme">
          <Input id="ls-theme" list="ls-theme-list" value={v.theme} onChange={(e) => setV({ ...v, theme: e.target.value })} />
          <datalist id="ls-theme-list">
            {themes.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="年级" htmlFor="ls-grade">
          <Input id="ls-grade" list="ls-grade-list" value={v.grade} onChange={(e) => setV({ ...v, grade: e.target.value })} />
          <datalist id="ls-grade-list">
            {GRADES.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </Field>
        <Field label="课时总长（分钟）" htmlFor="ls-total" error={errors.total_minutes}>
          <Input id="ls-total" inputMode="numeric" value={v.total_minutes} onChange={(e) => setV({ ...v, total_minutes: e.target.value })} />
        </Field>
      </div>
      <Field label="教学目标" htmlFor="ls-obj">
        <Textarea id="ls-obj" rows={3} value={v.objectives} onChange={(e) => setV({ ...v, objectives: e.target.value })} />
      </Field>
      <Field label="备注" htmlFor="ls-notes">
        <Textarea id="ls-notes" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      </Field>
    </FormDialog>
  );
}
