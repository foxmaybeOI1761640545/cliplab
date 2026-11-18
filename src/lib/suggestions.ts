import { CLIP_SOFT_LIMIT_SECONDS } from "./constants";
import { summarizeLesson } from "./lesson";

type ClipLike = {
  id: string;
  name: string;
  animation_id: string;
  episode_id: string | null;
  start_seconds: number | null;
  end_seconds: number | null;
  status: string;
};
type ResourceLike = {
  id: string;
  clip_id: string | null;
  animation_id: string | null;
  episode_id: string | null;
  platform: string | null;
  url: string | null;
  play_status: string;
  copyright_status: string;
};
type LessonLike = { id: string; title: string; total_minutes: number };
type ItemLike = { lesson_id: string; stage: string; minutes: number | string | null };
type TaskLike = { task_type: string; status: string; clip_id: string | null; lesson_id: string | null; title: string };

export type Suggestion = {
  key: string;
  taskType: string;
  title: string;
  detail: string;
  priority: "高" | "中" | "低";
  clip_id?: string | null;
  animation_id?: string | null;
  episode_id?: string | null;
  lesson_id?: string | null;
};

/** 只根据已有记录推导下一步行动；已存在未完成的同类任务则不再重复建议 */
export function deriveSuggestions(input: {
  clips: ClipLike[];
  resources: ResourceLike[];
  lessons: LessonLike[];
  items: ItemLike[];
  tasks: TaskLike[];
}): Suggestion[] {
  const out: Suggestion[] = [];
  const open = input.tasks.filter((t) => t.status !== "已完成");
  const hasOpen = (type: string, ref: { clip_id?: string | null; lesson_id?: string | null; title?: string }) =>
    open.some(
      (t) =>
        t.task_type === type &&
        (ref.clip_id ? t.clip_id === ref.clip_id : true) &&
        (ref.lesson_id ? t.lesson_id === ref.lesson_id : true) &&
        (!ref.clip_id && !ref.lesson_id && ref.title ? t.title === ref.title : true),
    );
  const resByClip = new Map<string, ResourceLike[]>();
  for (const r of input.resources) if (r.clip_id) resByClip.set(r.clip_id, [...(resByClip.get(r.clip_id) ?? []), r]);

  for (const c of input.clips) {
    if (c.status === "暂不使用") continue;
    const base = { clip_id: c.id, animation_id: c.animation_id, episode_id: c.episode_id };
    if (c.start_seconds == null || c.end_seconds == null) {
      if (!hasOpen("补充时间码", { clip_id: c.id }))
        out.push({ key: `tc-${c.id}`, taskType: "补充时间码", title: `补充「${c.name}」的开始/结束时间`, detail: "片段尚未记录完整时间段，无法计算时长。", priority: "中", ...base });
    } else if (c.end_seconds - c.start_seconds > CLIP_SOFT_LIMIT_SECONDS) {
      if (!hasOpen("剪辑片段", { clip_id: c.id }))
        out.push({ key: `long-${c.id}`, taskType: "剪辑片段", title: `考虑缩短「${c.name}」`, detail: "片段超过 5 分钟，可截取关键段落。", priority: "低", ...base });
    }
    if (c.status === "待剪辑" && !hasOpen("剪辑片段", { clip_id: c.id }))
      out.push({ key: `cut-${c.id}`, taskType: "剪辑片段", title: `完成「${c.name}」的剪辑`, detail: "片段状态为待剪辑。", priority: "中", ...base });
    if (!resByClip.has(c.id) && !hasOpen("核实播放", { clip_id: c.id }))
      out.push({ key: `nores-${c.id}`, taskType: "核实播放", title: `为「${c.name}」登记播放资源`, detail: "该片段还没有任何资源记录。", priority: "中", ...base });
  }

  for (const r of input.resources) {
    const label = r.platform || "未填写平台的资源";
    const base = { clip_id: r.clip_id, animation_id: r.animation_id, episode_id: r.episode_id };
    const ref = r.clip_id ? { clip_id: r.clip_id } : { title: "" };
    if (r.play_status === "链接失效" && !hasOpen("更换链接", { ...ref, title: `更换失效链接：${label}` }))
      out.push({ key: `dead-${r.id}`, taskType: "更换链接", title: `更换失效链接：${label}`, detail: "该资源被标记为链接失效。", priority: "高", ...base });
    else if (!r.url && !hasOpen("更换链接", { ...ref, title: `填写播放链接：${label}` }))
      out.push({ key: `nourl-${r.id}`, taskType: "更换链接", title: `填写播放链接：${label}`, detail: "资源记录尚未填写实际链接。", priority: "低", ...base });
    if (r.play_status === "待核实" && !hasOpen("核实播放", { ...ref, title: `核实播放可用性：${label}` }))
      out.push({ key: `play-${r.id}`, taskType: "核实播放", title: `核实播放可用性：${label}`, detail: "播放状态仍为待核实，不能视为可用。", priority: "中", ...base });
    if ((r.copyright_status === "待核实" || r.copyright_status === "需进一步确认") && !hasOpen("确认版权", { ...ref, title: `确认版权/课堂使用：${label}` }))
      out.push({ key: `cr-${r.id}`, taskType: "确认版权", title: `确认版权/课堂使用：${label}`, detail: `版权状态为「${r.copyright_status}」。`, priority: "中", ...base });
  }

  for (const l of input.lessons) {
    const s = summarizeLesson(input.items.filter((i) => i.lesson_id === l.id), l.total_minutes);
    if (s.state === "over" && !hasOpen("调整课堂流程", { lesson_id: l.id }))
      out.push({ key: `over-${l.id}`, taskType: "调整课堂流程", title: `调整「${l.title}」的课堂用时`, detail: `预计 ${s.used} 分钟，超出课时 ${-s.remaining} 分钟。`, priority: "高", lesson_id: l.id });
  }

  const rank = { 高: 0, 中: 1, 低: 2 } as const;
  return out.sort((a, b) => rank[a.priority] - rank[b.priority]);
}
