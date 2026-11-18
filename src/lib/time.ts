export type ParseResult = { ok: true; seconds: number | null } | { ok: false; error: string };

/**
 * 解析时间码：支持 mm:ss 与 hh:mm:ss（分隔符可用 : 或 ：），空值视为“暂未知”。
 */
export function parseTimecode(input: string | null | undefined): ParseResult {
  const raw = (input ?? "").trim().replace(/：/g, ":");
  if (!raw) return { ok: true, seconds: null };
  const parts = raw.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,3}$/.test(p))) {
    return { ok: false, error: "请使用 mm:ss 或 hh:mm:ss 格式" };
  }
  const nums = parts.map(Number);
  if (parts.length === 2) {
    const [m, s] = nums;
    if (s >= 60) return { ok: false, error: "秒数需小于 60" };
    return { ok: true, seconds: m * 60 + s };
  }
  const [h, m, s] = nums;
  if (m >= 60 || s >= 60) return { ok: false, error: "分钟和秒数需小于 60" };
  return { ok: true, seconds: h * 3600 + m * 60 + s };
}

export function formatTimecode(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "";
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** 计算片段时长（秒）。缺少任一时间返回 null；结束不晚于开始返回 error。 */
export function clipDuration(
  start: number | null | undefined,
  end: number | null | undefined,
): { seconds: number | null; error?: string } {
  if (start == null || end == null) return { seconds: null };
  if (end <= start) return { seconds: null, error: "结束时间必须晚于开始时间" };
  return { seconds: end - start };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}秒`;
  return s === 0 ? `${m}分钟` : `${m}分${s}秒`;
}

export function formatMinutes(min: number | null | undefined): string {
  if (min == null || Number.isNaN(Number(min))) return "—";
  const n = Math.round(Number(min) * 10) / 10;
  return `${n}分钟`;
}

export function secondsToMinutes(seconds: number | null | undefined): number | null {
  if (seconds == null) return null;
  return Math.round((seconds / 60) * 10) / 10;
}
