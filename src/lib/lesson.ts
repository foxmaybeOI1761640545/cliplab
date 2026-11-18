import { STAGES, type Stage } from "./constants";

export type LessonItemLike = { stage: string; minutes: number | string | null };

export type LessonSummary = {
  byStage: Record<Stage, number>;
  used: number;
  total: number;
  remaining: number;
  state: "over" | "exact" | "under";
  percent: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarizeLesson(items: LessonItemLike[], totalMinutes: number): LessonSummary {
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const it of items) {
    const m = Number(it.minutes) || 0;
    if ((STAGES as readonly string[]).includes(it.stage)) {
      byStage[it.stage as Stage] = round1(byStage[it.stage as Stage] + m);
    }
  }
  const used = round1(Object.values(byStage).reduce((a, b) => a + b, 0));
  const total = totalMinutes > 0 ? totalMinutes : 0;
  const remaining = round1(total - used);
  const state = remaining < 0 ? "over" : remaining === 0 ? "exact" : "under";
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return { byStage, used, total, remaining, state, percent };
}

export function describeLessonTime(s: LessonSummary): string {
  if (s.state === "over") return `已超时 ${round1(-s.remaining)} 分钟`;
  if (s.state === "exact") return "刚好用满课时";
  return `剩余 ${s.remaining} 分钟`;
}
