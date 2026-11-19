import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SimpleSelect } from "../form-bits";
import { FormDialog, emptyToNull, numOrNull } from "./form-dialog";
import { DemoSwitchField } from "@/components/app/demo-switch-field";
import { normalize, useAllData, useDb, type Episode } from "@/lib/db";
import { formatTimecode, parseTimecode } from "@/lib/time";

export function EpisodeForm({
  record,
  defaults,
  open,
  onOpenChange,
}: {
  record?: Episode | null;
  defaults?: { animation_id?: string };
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const data = useAllData();
  const db = useDb();
  const [v, setV] = useState({
    is_demo: record?.is_demo ?? false,
    animation_id: record?.animation_id ?? defaults?.animation_id ?? null,
    season: record?.season?.toString() ?? "",
    episode_number: record?.episode_number?.toString() ?? "",
    title: record?.title ?? "",
    duration: formatTimecode(record?.duration_seconds),
    synopsis: record?.synopsis ?? "",
    source_url: record?.source_url ?? "",
    notes: record?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!v.animation_id) e.animation_id = "请选择所属动画";
    const season = numOrNull(v.season);
    const epNo = numOrNull(v.episode_number);
    if (Number.isNaN(season) || (season != null && (season < 0 || !Number.isInteger(season)))) e.season = "请输入整数";
    if (Number.isNaN(epNo) || (epNo != null && (epNo < 0 || !Number.isInteger(epNo)))) e.episode_number = "请输入整数";
    if (epNo == null && !v.title.trim()) e.title = "集数编号与标题至少填写一项";
    const dur = parseTimecode(v.duration);
    if (!dur.ok) e.duration = dur.error;
    const url = v.source_url.trim();
    if (url && !/^https?:\/\//i.test(url)) e.source_url = "链接需以 http:// 或 https:// 开头";
    if (!e.animation_id && !e.title) {
      const dup = data.episodes.find(
        (x) =>
          x.id !== record?.id &&
          x.animation_id === v.animation_id &&
          ((epNo != null && x.episode_number === epNo && (x.season ?? null) === (season ?? null)) ||
            (v.title.trim() && normalize(x.title) === normalize(v.title))),
      );
      if (dup) e.title = "该动画下已登记过相同编号或标题的集数";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const payload = {
        is_demo: v.is_demo,
        animation_id: v.animation_id!,
        season: season as number | null,
        episode_number: epNo as number | null,
        title: emptyToNull(v.title),
        duration_seconds: dur.ok ? dur.seconds : null,
        synopsis: emptyToNull(v.synopsis),
        source_url: emptyToNull(url),
        notes: emptyToNull(v.notes),
      };
      if (record) await db.update("episodes", record.id, payload);
      else await db.insert("episodes", payload);
      toast.success(record ? "集数已更新" : "已新增集数");
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
      title={record ? "编辑集数" : "新增集数"}
      description="整集信息仅作参考；课堂建议优先使用 1–5 分钟的短片段。"
      onSubmit={submit}
      busy={busy}
    >
      <Field label="所属动画" required error={errors.animation_id}>
        <SimpleSelect
          value={v.animation_id}
          onChange={(x) => setV({ ...v, animation_id: x })}
          options={data.animations.map((a) => ({ value: a.id, label: a.name }))}
          placeholder={data.animations.length ? "选择动画作品" : "请先新增动画作品"}
          ariaLabel="所属动画"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="季" htmlFor="ep-season" error={errors.season}>
          <Input id="ep-season" inputMode="numeric" value={v.season} onChange={(e) => setV({ ...v, season: e.target.value })} placeholder="可选" />
        </Field>
        <Field label="集" htmlFor="ep-no" error={errors.episode_number}>
          <Input id="ep-no" inputMode="numeric" value={v.episode_number} onChange={(e) => setV({ ...v, episode_number: e.target.value })} />
        </Field>
        <Field label="整集时长" htmlFor="ep-dur" error={errors.duration} hint="mm:ss 或 hh:mm:ss">
          <Input id="ep-dur" className="font-timecode" value={v.duration} onChange={(e) => setV({ ...v, duration: e.target.value })} placeholder="22:30" />
        </Field>
      </div>
      <Field label="集数标题" htmlFor="ep-title" error={errors.title}>
        <Input id="ep-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      </Field>
      <Field label="剧情梗概" htmlFor="ep-syn">
        <Textarea id="ep-syn" rows={3} value={v.synopsis} onChange={(e) => setV({ ...v, synopsis: e.target.value })} />
      </Field>
      <Field label="原始资源链接" htmlFor="ep-url" error={errors.source_url} hint="仅记录链接，播放与版权情况请在「资源核实」中登记">
        <Input id="ep-url" type="url" value={v.source_url} onChange={(e) => setV({ ...v, source_url: e.target.value })} placeholder="https://" />
      </Field>
      <Field label="备注" htmlFor="ep-notes">
        <Textarea id="ep-notes" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      </Field>
      <DemoSwitchField checked={v.is_demo} onCheckedChange={(checked) => setV((current) => ({ ...current, is_demo: checked }))} />
    </FormDialog>
  );
}
