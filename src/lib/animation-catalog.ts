export type AnimationCatalogSort = "updated" | "name" | "episodes";

export type AnimationCatalogRecord = {
  id: string;
  name: string;
  aliases: string | null;
  production_info: string | null;
  synopsis: string | null;
  notes: string | null;
  theme_tags: string[];
  updated_at: string;
};

const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
const normalizeText = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, "");

export function filterAndSortAnimations<T extends AnimationCatalogRecord>(
  records: T[],
  options: { query?: string; theme?: string | null; sort?: AnimationCatalogSort },
  episodeCounts: ReadonlyMap<string, number> = new Map(),
): T[] {
  const query = normalizeText(options.query ?? "");
  const theme = options.theme ?? null;

  const filtered = records.filter((record) => {
    if (theme && !record.theme_tags.includes(theme)) return false;
    if (!query) return true;
    const haystack = [
      record.name,
      record.aliases ?? "",
      record.production_info ?? "",
      record.synopsis ?? "",
      record.notes ?? "",
      ...record.theme_tags,
    ].map(normalizeText).join(" ");
    return haystack.includes(query);
  });

  switch (options.sort ?? "updated") {
    case "name":
      return filtered.sort((a, b) => collator.compare(a.name, b.name));
    case "episodes":
      return filtered.sort((a, b) =>
        (episodeCounts.get(b.id) ?? 0) - (episodeCounts.get(a.id) ?? 0) ||
        collator.compare(a.name, b.name),
      );
    default:
      return filtered.sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at) ||
        collator.compare(a.name, b.name),
      );
  }
}

export type AnimationSort = AnimationCatalogSort;
