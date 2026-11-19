import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, ThemeInput } from "../form-bits";
import { FormDialog, emptyToNull } from "./form-dialog";
import { useAllData, useDb, type Animation } from "@/lib/db";
import { findDuplicateAnimation } from "@/lib/animation-catalog";

export function AnimationForm({
  record,
  open,
  onOpenChange,
  onSaved,
}: {
  record?: Animation | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (a: Animation) => void;
}) {
  const data = useAllData();
  const db = useDb();
  const [v, setV] = useState({
    name: record?.name ?? "",
    aliases: record?.aliases ?? "",
    production_info: record?.production_info ?? "",
    synopsis: record?.synopsis ?? "",
    theme_tags: record?.theme_tags ?? [],
    notes: record?.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allThemes = Array.from(new Set(data.animations.flatMap((a) => a.theme_tags).concat(data.clips.flatMap((c) => c.themes))));

  const submit = async () => {
    const name = v.name.trim();
    if (!name) return setErr("请填写动画名称");
    const dup = findDuplicateAnimation(data.animations, {
      name,
      aliases: v.aliases,
      excludeId: record?.id,
    });
    if (dup) return setErr(`名称或别名与「${dup.name}」重复，请直接在该作品下添加集数`);
    setErr(null);
    setBusy(true);
    try {
      const payload = {
        name,
        aliases: emptyToNull(v.aliases),
        production_info: emptyToNull(v.production_info),
        synopsis: emptyToNull(v.synopsis),
        theme_tags: v.theme_tags,
        notes: emptyToNull(v.notes),
      };
      const saved = record ? await db.update("animations", record.id, payload) : (await db.insert("animations", payload))[0];
      toast.success(record ? "动画作品已更新" : "已新增动画作品");
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "编辑动画作品" : "新增动画作品"}
      description="登记一部国产动画，之后可在其下添加集数与片段。"
      onSubmit={submit}
      busy={busy}
    >
      <Field label="动画名称" htmlFor="an-name" required error={err}>
        <Input id="an-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="别名" htmlFor="an-alias" hint="多个别名用顿号或逗号分隔">
          <Input id="an-alias" value={v.aliases} onChange={(e) => setV({ ...v, aliases: e.target.value })} />
        </Field>
        <Field label="国产/制作信息" htmlFor="an-prod" hint="可选：出品方、年份等">
          <Input id="an-prod" value={v.production_info} onChange={(e) => setV({ ...v, production_info: e.target.value })} />
        </Field>
      </div>
      <Field label="简介" htmlFor="an-syn">
        <Textarea id="an-syn" rows={3} value={v.synopsis} onChange={(e) => setV({ ...v, synopsis: e.target.value })} />
      </Field>
      <Field label="主题标签">
        <ThemeInput value={v.theme_tags} onChange={(t) => setV({ ...v, theme_tags: t })} suggestions={allThemes} />
      </Field>
      <Field label="备注" htmlFor="an-notes">
        <Textarea id="an-notes" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      </Field>
    </FormDialog>
  );
}
