import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Animation = Tables<"animations">;
export type Episode = Tables<"episodes">;
export type Clip = Tables<"clips">;
export type Resource = Tables<"resources">;
export type LessonPlan = Tables<"lesson_plans">;
export type LessonItem = Tables<"lesson_items">;
export type ActionTask = Tables<"action_tasks">;

export type TableName =
  | "animations"
  | "episodes"
  | "clips"
  | "resources"
  | "lesson_plans"
  | "lesson_items"
  | "action_tasks";

const tableQuery = <T extends TableName>(table: T) =>
  queryOptions({
    queryKey: ["db", table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5000);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Tables<T>[];
    },
    staleTime: 15_000,
  });

export const q = {
  animations: tableQuery("animations"),
  episodes: tableQuery("episodes"),
  clips: tableQuery("clips"),
  resources: tableQuery("resources"),
  lessonPlans: tableQuery("lesson_plans"),
  lessonItems: tableQuery("lesson_items"),
  tasks: tableQuery("action_tasks"),
};

export const allQueries = Object.values(q);

export function useAllData() {
  const animations = useSuspenseQuery(q.animations).data;
  const episodes = useSuspenseQuery(q.episodes).data;
  const clips = useSuspenseQuery(q.clips).data;
  const resources = useSuspenseQuery(q.resources).data;
  const lessonPlans = useSuspenseQuery(q.lessonPlans).data;
  const lessonItems = useSuspenseQuery(q.lessonItems).data;
  const tasks = useSuspenseQuery(q.tasks).data;

  return useMemo(() => {
    const animationById = new Map(animations.map((a) => [a.id, a]));
    const episodeById = new Map(episodes.map((e) => [e.id, e]));
    const clipById = new Map(clips.map((c) => [c.id, c]));
    const lessonById = new Map(lessonPlans.map((l) => [l.id, l]));
    const group = <T, K extends keyof T>(arr: T[], key: K) => {
      const m = new Map<string, T[]>();
      for (const x of arr) {
        const k = x[key] as unknown as string | null;
        if (!k) continue;
        const list = m.get(k) ?? [];
        list.push(x);
        m.set(k, list);
      }
      return m;
    };
    return {
      animations,
      episodes,
      clips,
      resources,
      lessonPlans,
      lessonItems,
      tasks,
      animationById,
      episodeById,
      clipById,
      lessonById,
      episodesByAnimation: group(episodes, "animation_id"),
      clipsByAnimation: group(clips, "animation_id"),
      clipsByEpisode: group(clips, "episode_id"),
      resourcesByClip: group(resources, "clip_id"),
      itemsByLesson: group(lessonItems, "lesson_id"),
      itemsByClip: group(lessonItems, "clip_id"),
    };
  }, [animations, episodes, clips, resources, lessonPlans, lessonItems, tasks]);
}
export type AllData = ReturnType<typeof useAllData>;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useDb() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["db"] });
  return {
    refresh,
    async insert<T extends TableName>(table: T, values: TablesInsert<T> | TablesInsert<T>[]) {
      const { data, error } = await (supabase.from(table) as any).insert(values).select();
      if (error) throw new Error(friendlyError(error.message));
      await refresh();
      return data as Tables<T>[];
    },
    async update<T extends TableName>(table: T, id: string, values: TablesUpdate<T>) {
      const { data, error } = await (supabase.from(table) as any).update(values).eq("id", id).select();
      if (error) throw new Error(friendlyError(error.message));
      await refresh();
      return (data as Tables<T>[])[0];
    },
    async remove(table: TableName, ids: string | string[]) {
      const list = Array.isArray(ids) ? ids : [ids];
      if (!list.length) return;
      const { error } = await (supabase.from(table) as any).delete().in("id", list);
      if (error) throw new Error(friendlyError(error.message));
      await refresh();
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function friendlyError(msg: string): string {
  if (/duplicate key|unique/i.test(msg)) return "已存在同名记录，请勿重复保存";
  if (/violates check constraint/i.test(msg)) return "填写的数据不符合要求，请检查时间与数值";
  if (/foreign key/i.test(msg)) return "关联的记录不存在或已被删除";
  if (/JWT|auth/i.test(msg)) return "登录状态已失效，请重新登录";
  return msg;
}

/* ---------- 展示辅助 ---------- */

export function episodeLabel(ep: Pick<Episode, "season" | "episode_number" | "title"> | undefined | null) {
  if (!ep) return "未指定集数";
  const parts: string[] = [];
  if (ep.season != null) parts.push(`第${ep.season}季`);
  if (ep.episode_number != null) parts.push(`第${ep.episode_number}集`);
  const head = parts.join(" ");
  if (ep.title) return head ? `${head}·${ep.title}` : ep.title;
  return head || "未命名集数";
}

export type ResourceSummary = {
  count: number;
  play: string;
  copyright: string;
  latest?: Resource;
};

/** 片段的资源状态摘要：取最近核实（或最近编辑）的资源；无资源时为“未登记” */
export function summarizeResources(list: Resource[] | undefined): ResourceSummary {
  if (!list || list.length === 0) return { count: 0, play: "未登记", copyright: "未登记" };
  const sorted = [...list].sort((a, b) => {
    const av = a.verified_at ?? "";
    const bv = b.verified_at ?? "";
    if (av !== bv) return bv.localeCompare(av);
    return b.updated_at.localeCompare(a.updated_at);
  });
  const latest = sorted[0];
  return { count: list.length, play: latest.play_status, copyright: latest.copyright_status, latest };
}

export function clipSeconds(c: Pick<Clip, "start_seconds" | "end_seconds">): number | null {
  if (c.start_seconds == null || c.end_seconds == null) return null;
  return c.end_seconds > c.start_seconds ? c.end_seconds - c.start_seconds : null;
}

/** 课堂播放分钟数：优先使用手填值，否则用时间段换算 */
export function clipPlayMinutes(c: Clip): number | null {
  if (c.play_minutes != null) return Number(c.play_minutes);
  const s = clipSeconds(c);
  return s == null ? null : Math.round((s / 60) * 10) / 10;
}

export const normalize = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, "");

export const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
