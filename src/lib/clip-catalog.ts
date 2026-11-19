export type ClipCatalogRecord = {
  id: string;
  name: string;
  animation_id: string;
  episode_id: string | null;
  stage: string | null;
  status: string;
  grade: string;
  themes: string[] | null;
  start_seconds: number | null;
  end_seconds: number | null;
  play_minutes: number | null;
  updated_at: string;
  highlight_notes: string | null;
  questions: string | null;
  discussion_goal: string | null;
  summary: string | null;
  teaching_notes: string | null;
  animation_name?: string | null;
  episode_label?: string | null;
  resource_play_statuses?: string[];
  resource_copyright_statuses?: string[];
};

export type ClipCatalogSort = "updated" | "name" | "start" | "duration-desc" | "duration-asc";

export type ClipCatalogFilters = {
  query?: string;
  animationId?: string | null;
  episodeId?: string | null;
  theme?: string | null;
  stage?: string | null;
  grade?: string | null;
  status?: string | null;
  playStatus?: string | null;
  copyrightStatus?: string | null;
  sort?: ClipCatalogSort;
};

const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
const normalizeText = (value: string | null | undefined) =>
  (value ?? "").normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, "");

function durationMinutes(record: ClipCatalogRecord): number | null {
  if (record.play_minutes != null) return Number(record.play_minutes);
  if (record.start_seconds == null || record.end_seconds == null || record.end_seconds <= record.start_seconds) return null;
  return (record.end_seconds - record.start_seconds) / 60;
}

export function filterAndSortClips<T extends ClipCatalogRecord>(
  records: readonly T[],
  filters: ClipCatalogFilters,
): T[] {
  const query = normalizeText(filters.query);
  const filtered = records.filter((record) => {
    if (filters.animationId && record.animation_id !== filters.animationId) return false;
    if (filters.episodeId && record.episode_id !== filters.episodeId) return false;
    if (filters.theme && !(record.themes ?? []).includes(filters.theme)) return false;
    if (filters.stage) {
      if (filters.stage === "未设阶段" ? Boolean(record.stage) : record.stage !== filters.stage) return false;
    }
    if (filters.grade && record.grade !== filters.grade) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (filters.playStatus) {
      const statuses = record.resource_play_statuses ?? [];
      if (filters.playStatus === "未登记" ? statuses.length > 0 : !statuses.includes(filters.playStatus)) return false;
    }
    if (filters.copyrightStatus) {
      const statuses = record.resource_copyright_statuses ?? [];
      if (filters.copyrightStatus === "未登记" ? statuses.length > 0 : !statuses.includes(filters.copyrightStatus)) return false;
    }
    if (!query) return true;

    const haystack = [
      record.name,
      record.animation_name,
      record.episode_label,
      record.stage,
      record.grade,
      record.status,
      record.highlight_notes,
      record.questions,
      record.discussion_goal,
      record.summary,
      record.teaching_notes,
      ...(record.themes ?? []),
    ].map(normalizeText).join(" ");
    return haystack.includes(query);
  });

  switch (filters.sort ?? "updated") {
    case "name":
      return filtered.sort((a, b) => collator.compare(a.name, b.name));
    case "start":
      return filtered.sort((a, b) =>
        (a.start_seconds ?? Number.MAX_SAFE_INTEGER) - (b.start_seconds ?? Number.MAX_SAFE_INTEGER) ||
        collator.compare(a.name, b.name),
      );
    case "duration-desc":
      return filtered.sort((a, b) =>
        (durationMinutes(b) ?? -1) - (durationMinutes(a) ?? -1) || collator.compare(a.name, b.name),
      );
    case "duration-asc":
      return filtered.sort((a, b) =>
        (durationMinutes(a) ?? Number.MAX_SAFE_INTEGER) - (durationMinutes(b) ?? Number.MAX_SAFE_INTEGER) ||
        collator.compare(a.name, b.name),
      );
    default:
      return filtered.sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at) || collator.compare(a.name, b.name),
      );
  }
}
