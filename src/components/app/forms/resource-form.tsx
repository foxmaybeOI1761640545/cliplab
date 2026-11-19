import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FormGroup, SimpleSelect } from "../form-bits";
import { FormDialog, emptyToNull } from "./form-dialog";
import { DemoSwitchField } from "@/components/app/demo-switch-field";
import { episodeLabel, todayISO, useAllData, useDb, type Resource } from "@/lib/db";
import { COPYRIGHT_STATUSES, PLAY_STATUSES } from "@/lib/constants";

export type ResourceDefaults = { animation_id?: string; episode_id?: string; clip_id?: string };

export function ResourceForm({
  record,
  defaults,
  open,
  onOpenChange,
}: {
  record?: Resource | null;
  defaults?: ResourceDefaults;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const data = useAllData();
  const db = useDb();
  const initClip = record?.clip_id ?? defaults?.clip_id ?? null;
  const clip0 = initClip ? data.clipById.get(initClip) : undefined;
  const [v, setV] = useState({
    is_demo: record?.is_demo ?? false,
    clip_id: initClip,
    animation_id: record?.animation_id ?? defaults?.animation_id ?? clip0?.animation_id ?? null,
    episode_id: record?.episode_id ?? defaults?.episode_id ?? clip0?.episode_id ?? null,
    platform: record?.platform ?? "",
    url: record?.url ?? "",
    play_status: record?.play_status ?? "待核实",
    copyright_status: record?.copyright_status ?? "待核实",
    verified_at: record?.verified_at ?? "",
    verifier: record?.verifier ?? "",
    play_notes: record?.play_notes ?? "",
    copyright_notes: record?.copyright_notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof v>) => setV((p) => ({ ...p, ...patch }));
  const episodes = (v.animation_id ? data.episodesByAnimation.get(v.animation_id) : []) ?? [];
  const clips = data.clips.filter(
    (c) => (!v.animation_id || c.animation_id === v.animation_id) && (!v.episode_id || c.episode_id === v.episode_id),
  );

  const submit = async () => {
    const e: Record<string, string> = {};
    const url = v.url.trim();
    if (url && !/^https?:\/\//i.test(url)) e.url = "链接需以 http:// 或 https:// 开头";
    if (!v.platform.trim() && !url && !v.clip_id && !v.animation_id) e.platform = "请至少填写平台、链接或关联对象之一";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const payload = {
        is_demo: v.is_demo,
        clip_id: v.clip_id,
        animation_id: v.animation_id,
        episode_id: v.episode_id,
        platform: emptyToNull(v.platform),
        url: emptyToNull(url),
        play_status: v.play_status,
        copyright_status: v.copyright_status,
        verified_at: v.verified_at || null,
        verifier: emptyToNull(v.verifier),
        play_notes: emptyToNull(v.play_notes),
        copyright_notes: emptyToNull(v.copyright_notes),
      };
      if (record) await db.update("resources", record.id, payload);
      else await db.insert("resources", payload);
      toast.success(record ? "资源核实记录已保存" : "已新增资源记录");
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
      title={record ? "编辑资源与核实记录" : "新增资源"}
      description="只保存你填写的链接与核实结果，系统不会自动判断能否播放或是否授权。"
      onSubmit={submit}
      busy={busy}
      wide
    >
      <FormGroup title="关联对象">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="动画作品">
            <SimpleSelect
              value={v.animation_id}
              onChange={(x) => set({ animation_id: x, episode_id: null, clip_id: null })}
              options={data.animations.map((a) => ({ value: a.id, label: a.name }))}
              noneLabel="不关联"
              ariaLabel="关联动画"
            />
          </Field>
          <Field label="集数">
            <SimpleSelect
              value={v.episode_id}
              onChange={(x) => set({ episode_id: x, clip_id: null })}
              options={episodes.map((ep) => ({ value: ep.id, label: episodeLabel(ep) }))}
              noneLabel="不关联"
              ariaLabel="关联集数"
              disabled={!v.animation_id}
            />
          </Field>
          <Field label="片段">
            <SimpleSelect
              value={v.clip_id}
              onChange={(x) => {
                const c = x ? data.clipById.get(x) : undefined;
                set({ clip_id: x, ...(c ? { animation_id: c.animation_id, episode_id: c.episode_id } : {}) });
              }}
              options={clips.map((c) => ({ value: c.id, label: c.name }))}
              noneLabel="不关联"
              ariaLabel="关联片段"
            />
          </Field>
        </div>
      </FormGroup>

      <FormGroup title="平台与链接">
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <Field label="平台名称" htmlFor="res-pf" error={errors.platform}>
            <Input id="res-pf" value={v.platform} onChange={(e) => set({ platform: e.target.value })} placeholder="如：某视频平台" />
          </Field>
          <Field label="实际播放链接" htmlFor="res-url" error={errors.url} hint="可留空，之后随时更换">
            <Input id="res-url" type="url" value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" />
          </Field>
        </div>
      </FormGroup>

      <div className="flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs text-info">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          「播放可用性」只说明链接能否打开、是否免费；「版权/课堂使用」是另一件事，即使能免费播放，也不代表已获得课堂使用授权。两项都需你手动核实后更新。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormGroup title="播放可用性">
          <Field label="播放状态">
            <SimpleSelect value={v.play_status} onChange={(x) => set({ play_status: x ?? "待核实" })} options={PLAY_STATUSES} ariaLabel="播放状态" />
          </Field>
          <Field label="播放备注" htmlFor="res-pn">
            <Textarea id="res-pn" rows={2} value={v.play_notes} onChange={(e) => set({ play_notes: e.target.value })} placeholder="如：片头有广告、需会员第几集起" />
          </Field>
        </FormGroup>
        <FormGroup title="版权 / 课堂使用">
          <Field label="版权状态">
            <SimpleSelect
              value={v.copyright_status}
              onChange={(x) => set({ copyright_status: x ?? "待核实" })}
              options={COPYRIGHT_STATUSES}
              ariaLabel="版权状态"
            />
          </Field>
          <Field label="版权/平台备注" htmlFor="res-cn">
            <Textarea id="res-cn" rows={2} value={v.copyright_notes} onChange={(e) => set({ copyright_notes: e.target.value })} />
          </Field>
        </FormGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="核实日期" htmlFor="res-date">
          <div className="flex gap-2">
            <Input id="res-date" type="date" value={v.verified_at} onChange={(e) => set({ verified_at: e.target.value })} />
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => set({ verified_at: todayISO() })}>
              今天
            </Button>
          </div>
        </Field>
        <Field label="核实人/设备" htmlFor="res-ver" hint="可选">
          <Input id="res-ver" value={v.verifier} onChange={(e) => set({ verifier: e.target.value })} placeholder="如：教室电脑 / 本人手机" />
        </Field>
      </div>
      <DemoSwitchField checked={v.is_demo} onCheckedChange={(checked) => setV((current) => ({ ...current, is_demo: checked }))} />
    </FormDialog>
  );
}
