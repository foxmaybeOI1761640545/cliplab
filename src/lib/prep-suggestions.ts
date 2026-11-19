import {
  inspectResourceUrl,
  needsCopyrightVerification,
  needsPlayVerification,
} from "./resource-review";

type DemoFlag = { is_demo?: boolean | null };

export type PrepSuggestionData = {
  animations: Array<DemoFlag & { id: string; name: string }>;
  episodes: Array<DemoFlag & {
    id: string;
    animation_id: string;
    season?: number | null;
    episode_number?: number | null;
    title?: string | null;
    source_url?: string | null;
  }>;
  clips: Array<DemoFlag & {
    id: string;
    name: string;
    animation_id: string;
    episode_id: string | null;
    status: string;
    start_seconds: number | null;
    end_seconds: number | null;
    questions: string | null;
    discussion_goal: string | null;
    summary: string | null;
  }>;
  resources: Array<DemoFlag & {
    id: string;
    animation_id: string | null;
    episode_id: string | null;
    clip_id: string | null;
    platform: string | null;
    url: string | null;
    play_status: string;
    copyright_status: string;
  }>;
  lessonPlans: Array<DemoFlag & { id: string; title: string }>;
  lessonItems: Array<{ lesson_id: string }>;
  tasks: Array<DemoFlag & {
    id: string;
    task_type: string;
    status: string;
    animation_id: string | null;
    episode_id: string | null;
    clip_id: string | null;
    lesson_id: string | null;
  }>;
};

export type PrepSuggestion = {
  id: string;
  title: string;
  task_type: string;
  priority: "高" | "中" | "低";
  reason: string;
  notes: string;
  animation_id: string | null;
  episode_id: string | null;
  clip_id: string | null;
  lesson_id: string | null;
  alreadyTracked: boolean;
};

const isDemo = (record: DemoFlag | undefined) => Boolean(record?.is_demo);
const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

function episodeName(episode: PrepSuggestionData["episodes"][number] | undefined) {
  if (!episode) return "";
  const parts: string[] = [];
  if (episode.season != null) parts.push("第" + episode.season + "季");
  if (episode.episode_number != null) parts.push("第" + episode.episode_number + "集");
  return [parts.join(" "), episode.title].filter(Boolean).join(" · ");
}

function makeSuggestion(
  data: PrepSuggestionData,
  input: Omit<PrepSuggestion, "alreadyTracked">,
): PrepSuggestion {
  const target = input.clip_id
    ? { field: "clip_id" as const, value: input.clip_id }
    : input.episode_id
      ? { field: "episode_id" as const, value: input.episode_id }
      : input.animation_id
        ? { field: "animation_id" as const, value: input.animation_id }
        : input.lesson_id
          ? { field: "lesson_id" as const, value: input.lesson_id }
          : null;

  const alreadyTracked = Boolean(target && data.tasks.some((task) =>
    !isDemo(task) &&
    task.status !== "已完成" &&
    task.task_type === input.task_type &&
    task[target.field] === target.value,
  ));

  return { ...input, alreadyTracked };
}

/** Creates suggestions only; it never writes tasks or modifies source records. */
export function buildPrepSuggestions(data: PrepSuggestionData): PrepSuggestion[] {
  const animationById = new Map(data.animations.map((item) => [item.id, item]));
  const episodeById = new Map(data.episodes.map((item) => [item.id, item]));
  const clipById = new Map(data.clips.map((item) => [item.id, item]));
  const suggestions: PrepSuggestion[] = [];
  const emitted = new Set<string>();

  const add = (input: Omit<PrepSuggestion, "alreadyTracked">) => {
    const key = [input.task_type, input.clip_id, input.episode_id, input.animation_id, input.lesson_id].join(":");
    if (emitted.has(key)) return;
    emitted.add(key);
    suggestions.push(makeSuggestion(data, input));
  };

  const objectIsDemo = (clipId: string | null, episodeId: string | null, animationId: string | null) => {
    const clip = clipId ? clipById.get(clipId) : undefined;
    const episode = episodeId ? episodeById.get(episodeId) : undefined;
    const animation = animationId ? animationById.get(animationId) : undefined;
    return isDemo(clip) || isDemo(episode) || isDemo(animation);
  };

  for (const clip of data.clips) {
    if (isDemo(clip) || objectIsDemo(clip.id, clip.episode_id, clip.animation_id)) continue;
    const animation = animationById.get(clip.animation_id);
    const episode = clip.episode_id ? episodeById.get(clip.episode_id) : undefined;
    const context = [animation?.name, episodeName(episode)].filter(Boolean).join(" · ");
    const subject = clip.name + (context ? "（" + context + "）" : "");
    const clipResources = data.resources.filter((resource) =>
      resource.clip_id === clip.id && !isDemo(resource),
    );

    if (clipResources.length === 0) {
      add({
        id: "missing-resource:" + clip.id,
        title: "补充真实播放资源：" + clip.name,
        task_type: "核实播放",
        priority: "高",
        reason: "该真实片段尚未关联非 DEMO 资源记录。",
        notes: "请添加实际播放链接，并分别核实播放可用性与版权/课堂使用状态。不要把 example.com 等占位地址当作真实视频链接。",
        animation_id: clip.animation_id,
        episode_id: clip.episode_id,
        clip_id: clip.id,
        lesson_id: null,
      });
    } else {
      for (const resource of clipResources) {
        const linkState = inspectResourceUrl(resource.url);
        if (needsPlayVerification(resource)) {
          const needsReplacement = linkState !== "ready";
          add({
            id: "play-resource:" + resource.id,
            title: (needsReplacement ? "补充或更换播放链接：" : "核实播放可用性：") + clip.name,
            task_type: needsReplacement ? "更换链接" : "核实播放",
            priority: needsReplacement ? "高" : "中",
            reason: linkState === "placeholder"
              ? "当前记录使用的是占位域名，不是可验证的实际播放地址。"
              : linkState === "missing"
                ? "资源记录尚未填写实际播放链接。"
                : linkState === "invalid"
                  ? "资源链接格式无效或不是 HTTP(S) 地址。"
                  : "播放状态仍标记为待核实。",
            notes: "资源平台：" + (resource.platform || "未填写") + "。请在目标设备上实际打开视频，确认能否播放、是否免费、是否需要登录或会员，再回到资源记录更新状态。",
            animation_id: resource.animation_id ?? clip.animation_id,
            episode_id: resource.episode_id ?? clip.episode_id,
            clip_id: clip.id,
            lesson_id: null,
          });
        }
        if (needsCopyrightVerification(resource)) {
          add({
            id: "copyright-resource:" + resource.id,
            title: "确认课堂使用范围：" + clip.name,
            task_type: "确认版权",
            priority: "高",
            reason: "版权/课堂使用状态仍待核实；能免费播放不等于已获课堂使用许可。",
            notes: "请核实平台条款、版权说明及学校课堂播放场景，记录可确认的依据；不确定时保持「需进一步确认」，不要默认标记为已授权。",
            animation_id: resource.animation_id ?? clip.animation_id,
            episode_id: resource.episode_id ?? clip.episode_id,
            clip_id: clip.id,
            lesson_id: null,
          });
        }
      }
    }

    if (clip.status === "待剪辑") {
      add({
        id: "edit-clip:" + clip.id,
        title: "剪辑片段：" + clip.name,
        task_type: "剪辑片段",
        priority: "中",
        reason: "片段状态仍为待剪辑。",
        notes: "根据教学重点确定起止时间，保留关键画面并控制课堂播放时长。",
        animation_id: clip.animation_id,
        episode_id: clip.episode_id,
        clip_id: clip.id,
        lesson_id: null,
      });
    }

    if (clip.start_seconds == null || clip.end_seconds == null) {
      add({
        id: "timecode:" + clip.id,
        title: "补充片段时间码：" + clip.name,
        task_type: "补充时间码",
        priority: "中",
        reason: "片段缺少开始或结束时间，课堂播放位置尚不能准确定位。",
        notes: "补充准确的开始和结束时间码，并确认结束时间晚于开始时间。",
        animation_id: clip.animation_id,
        episode_id: clip.episode_id,
        clip_id: clip.id,
        lesson_id: null,
      });
    }

    if (!clip.questions?.trim()) {
      add({
        id: "questions:" + clip.id,
        title: "完善教师提问：" + clip.name,
        task_type: "完善提问",
        priority: "低",
        reason: "片段尚未填写教师提问。",
        notes: "结合七年级学生的理解水平，设计能够引出观察、解释和迁移的问题。",
        animation_id: clip.animation_id,
        episode_id: clip.episode_id,
        clip_id: clip.id,
        lesson_id: null,
      });
    }
  }

  for (const resource of data.resources) {
    if (isDemo(resource) || resource.clip_id) continue;
    if (objectIsDemo(null, resource.episode_id, resource.animation_id)) continue;
    const episode = resource.episode_id ? episodeById.get(resource.episode_id) : undefined;
    const animation = resource.animation_id ? animationById.get(resource.animation_id) : undefined;
    const subject = episode
      ? [animation?.name, episodeName(episode)].filter(Boolean).join(" · ")
      : animation?.name || "未关联动画";
    if (needsPlayVerification(resource)) {
      const linkState = inspectResourceUrl(resource.url);
      add({
        id: "play-resource:" + resource.id,
        title: (linkState === "ready" ? "核实播放可用性：" : "补充或更换播放链接：") + subject,
        task_type: linkState === "ready" ? "核实播放" : "更换链接",
        priority: linkState === "ready" ? "中" : "高",
        reason: "该资源的播放链接或播放状态尚未完成核实。",
        notes: "资源平台：" + (resource.platform || "未填写") + "。请实际打开链接，确认播放条件并更新资源记录。",
        animation_id: resource.animation_id,
        episode_id: resource.episode_id,
        clip_id: null,
        lesson_id: null,
      });
    }
    if (needsCopyrightVerification(resource)) {
      add({
        id: "copyright-resource:" + resource.id,
        title: "确认课堂使用范围：" + subject,
        task_type: "确认版权",
        priority: "高",
        reason: "版权/课堂使用状态仍待核实。",
        notes: "核实平台条款与课堂使用范围；播放免费不能直接推断为获得课堂使用授权。",
        animation_id: resource.animation_id,
        episode_id: resource.episode_id,
        clip_id: null,
        lesson_id: null,
      });
    }
  }

  for (const episode of data.episodes) {
    if (isDemo(episode) || !episode.source_url?.trim()) continue;
    if (objectIsDemo(null, episode.id, episode.animation_id)) continue;
    const hasResource = data.resources.some((resource) =>
      !isDemo(resource) && resource.episode_id === episode.id,
    );
    if (hasResource) continue;
    const animation = animationById.get(episode.animation_id);
    const subject = [animation?.name, episodeName(episode)].filter(Boolean).join(" · ");
    add({
      id: "episode-source:" + episode.id,
      title: "核实集数原始链接：" + subject,
      task_type: "核实播放",
      priority: "中",
      reason: "集数登记了原始链接，但尚未建立独立的资源核实记录。",
      notes: "请把原始链接登记到资源核实中，并分别记录播放可用性与版权/课堂使用状态。",
      animation_id: episode.animation_id,
      episode_id: episode.id,
      clip_id: null,
      lesson_id: null,
    });
  }

  for (const lesson of data.lessonPlans) {
    if (isDemo(lesson)) continue;
    const count = data.lessonItems.filter((item) => item.lesson_id === lesson.id).length;
    if (count > 0) continue;
    add({
      id: "lesson-flow:" + lesson.id,
      title: "开始编排课堂流程：" + lesson.title,
      task_type: "调整课堂流程",
      priority: "中",
      reason: "该课堂方案还没有添加任何教学环节。",
      notes: "将片段、提问、讨论和教师总结安排到五个教学阶段，并检查总时长。",
      animation_id: null,
      episode_id: null,
      clip_id: null,
      lesson_id: lesson.id,
    });
  }

  const priorityOrder = { 高: 0, 中: 1, 低: 2 };
  return suggestions.sort((a, b) =>
    Number(a.alreadyTracked) - Number(b.alreadyTracked) ||
    priorityOrder[a.priority] - priorityOrder[b.priority] ||
    collator.compare(a.title, b.title),
  );
}
