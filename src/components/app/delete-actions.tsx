import { toast } from "sonner";
import { useConfirm } from "./confirm-context";
import {
  episodeLabel,
  useAllData,
  useDb,
  type ActionTask,
  type Animation,
  type Clip,
  type Episode,
  type LessonPlan,
  type Resource,
} from "@/lib/db";

const Li = ({ children }: { children: React.ReactNode }) => <li className="ml-4 list-disc">{children}</li>;

export function useDeleteActions() {
  const confirm = useConfirm();
  const data = useAllData();
  const db = useDb();

  const run = async (fn: () => Promise<void>, msg: string, after?: () => void) => {
    try {
      await fn();
      toast.success(msg);
      after?.();
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    }
  };

  const clipRefs = (clipIds: Set<string>) => ({
    resources: data.resources.filter((r) => r.clip_id && clipIds.has(r.clip_id)).length,
    items: data.lessonItems.filter((i) => i.clip_id && clipIds.has(i.clip_id)).length,
    tasks: data.tasks.filter((t) => t.clip_id && clipIds.has(t.clip_id)).length,
  });

  return {
    animation(a: Animation, after?: () => void) {
      const eps = data.episodesByAnimation.get(a.id) ?? [];
      const clips = data.clipsByAnimation.get(a.id) ?? [];
      const refs = clipRefs(new Set(clips.map((c) => c.id)));
      const res = data.resources.filter((r) => r.animation_id === a.id).length;
      confirm({
        title: `删除动画「${a.name}」？`,
        description: (
          <>
            <p>此操作不可撤销，将会：</p>
            <ul className="space-y-1">
              <Li>同时删除其下 {eps.length} 个集数、{clips.length} 个片段</Li>
              <Li>保留 {Math.max(res, refs.resources)} 条相关资源记录，但解除与该动画/片段的关联</Li>
              <Li>{refs.items} 个课堂环节保留已改写的文字，但不再链接原片段</Li>
              <Li>相关备课行动保留，但解除关联</Li>
            </ul>
          </>
        ),
        onConfirm: () => run(() => db.remove("animations", a.id), "动画作品已删除", after),
      });
    },
    episode(e: Episode, after?: () => void) {
      const clips = data.clipsByEpisode.get(e.id) ?? [];
      const refs = clipRefs(new Set(clips.map((c) => c.id)));
      confirm({
        title: `删除集数「${episodeLabel(e)}」？`,
        description: (
          <ul className="space-y-1">
            <Li>同时删除该集下的 {clips.length} 个片段</Li>
            <Li>{refs.resources} 条资源记录保留但解除关联</Li>
            <Li>{refs.items} 个课堂环节保留文字但不再链接片段</Li>
          </ul>
        ),
        onConfirm: () => run(() => db.remove("episodes", e.id), "集数已删除", after),
      });
    },
    clip(c: Clip, after?: () => void) {
      const refs = clipRefs(new Set([c.id]));
      confirm({
        title: `删除片段「${c.name}」？`,
        description: (
          <ul className="space-y-1">
            <Li>{refs.resources} 条资源核实记录保留，但不再关联此片段</Li>
            <Li>{refs.items} 个课堂环节保留本课已填写的提问与总结，但不再链接此片段</Li>
            <Li>{refs.tasks} 个备课行动保留但解除关联</Li>
          </ul>
        ),
        onConfirm: () => run(() => db.remove("clips", c.id), "片段已删除", after),
      });
    },
    resource(r: Resource, after?: () => void) {
      confirm({
        title: "删除这条资源记录？",
        description: <p>将删除平台「{r.platform || "未填写"}」的链接与核实记录，关联的片段本身不受影响。</p>,
        onConfirm: () => run(() => db.remove("resources", r.id), "资源记录已删除", after),
      });
    },
    lesson(l: LessonPlan, after?: () => void) {
      const n = data.itemsByLesson.get(l.id)?.length ?? 0;
      confirm({
        title: `删除课堂方案「${l.title}」？`,
        description: <p>将同时删除方案内的 {n} 个流程环节。片段库中的原始片段不会被删除。</p>,
        onConfirm: () => run(() => db.remove("lesson_plans", l.id), "课堂方案已删除", after),
      });
    },
    task(t: ActionTask, after?: () => void) {
      confirm({
        title: `删除行动「${t.title}」？`,
        description: <p>删除后无法恢复。</p>,
        onConfirm: () => run(() => db.remove("action_tasks", t.id), "行动已删除", after),
      });
    },
  };
}
