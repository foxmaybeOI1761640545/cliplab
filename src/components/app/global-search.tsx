import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  episodeLabel,
  useAllData,
  type ActionTask,
  type AllData,
  type Animation,
  type Clip,
  type Episode,
  type LessonPlan,
  type Resource,
} from "@/lib/db";
import { useForms } from "./forms-context";

type SearchEntry =
  | { kind: "animation"; id: string; label: string; secondary?: string; searchText: string; record: Animation }
  | { kind: "episode"; id: string; label: string; secondary?: string; searchText: string; record: Episode }
  | { kind: "clip"; id: string; label: string; secondary?: string; searchText: string; record: Clip }
  | { kind: "lesson"; id: string; label: string; secondary?: string; searchText: string; record: LessonPlan }
  | { kind: "resource"; id: string; label: string; secondary?: string; searchText: string; record: Resource }
  | { kind: "task"; id: string; label: string; secondary?: string; searchText: string; record: ActionTask };

type SearchKind = SearchEntry["kind"];

const GROUPS: { kind: SearchKind; heading: string }[] = [
  { kind: "animation", heading: "动画作品" },
  { kind: "episode", heading: "集数" },
  { kind: "clip", heading: "片段" },
  { kind: "lesson", heading: "课堂方案" },
  { kind: "resource", heading: "资源" },
  { kind: "task", heading: "备课行动" },
];

const MAX_RESULTS_PER_GROUP = 8;

function makeSearchText(...values: (string | null | undefined)[]) {
  return values.filter(Boolean).join(" ").toLocaleLowerCase();
}

function makeSearchEntry(kind: SearchKind, row: unknown, data: AllData): SearchEntry {
  switch (kind) {
    case "animation": {
      const record = row as Animation;
      return {
        kind,
        id: record.id,
        label: record.name,
        secondary: record.production_info ?? undefined,
        searchText: makeSearchText("动画", record.name, record.aliases, record.production_info, record.synopsis, record.theme_tags?.join(" ")),
        record,
      };
    }
    case "episode": {
      const record = row as Episode;
      const animationName = data.animationById.get(record.animation_id)?.name ?? "";
      const label = episodeLabel(record);
      return {
        kind,
        id: record.id,
        label,
        secondary: animationName,
        searchText: makeSearchText("集", animationName, label, record.synopsis, record.notes),
        record,
      };
    }
    case "clip": {
      const record = row as Clip;
      const animationName = data.animationById.get(record.animation_id)?.name ?? "";
      const episode = record.episode_id ? data.episodeById.get(record.episode_id) : undefined;
      const episodeName = episodeLabel(episode);
      return {
        kind,
        id: record.id,
        label: record.name,
        secondary: [animationName, episodeName].filter(Boolean).join(" · "),
        searchText: makeSearchText("片段", record.name, animationName, episodeName, record.themes?.join(" "), record.questions, record.stage, record.highlight_notes),
        record,
      };
    }
    case "lesson": {
      const record = row as LessonPlan;
      return {
        kind,
        id: record.id,
        label: record.title,
        secondary: [record.theme, record.grade].filter(Boolean).join(" · "),
        searchText: makeSearchText("方案", record.title, record.theme, record.grade, record.objectives, record.notes),
        record,
      };
    }
    case "resource": {
      const record = row as Resource;
      const clip = record.clip_id ? data.clipById.get(record.clip_id) : undefined;
      const episode = record.episode_id ? data.episodeById.get(record.episode_id) : undefined;
      const animationId = record.animation_id ?? clip?.animation_id ?? episode?.animation_id;
      const animationName = animationId ? data.animationById.get(animationId)?.name ?? "" : "";
      return {
        kind,
        id: record.id,
        label: record.platform || "未填写平台",
        secondary: clip?.name ?? animationName,
        searchText: makeSearchText("资源", record.platform, record.url, record.play_status, record.copyright_status, record.play_notes, record.copyright_notes, clip?.name, animationName, episodeLabel(episode)),
        record,
      };
    }
    case "task": {
      const record = row as ActionTask;
      const animation = record.animation_id ? data.animationById.get(record.animation_id) : undefined;
      const episode = record.episode_id ? data.episodeById.get(record.episode_id) : undefined;
      const clip = record.clip_id ? data.clipById.get(record.clip_id) : undefined;
      const lesson = record.lesson_id ? data.lessonById.get(record.lesson_id) : undefined;
      const related = [animation?.name, episode ? episodeLabel(episode) : undefined, clip?.name, lesson?.title].filter(Boolean).join(" · ");
      return {
        kind,
        id: record.id,
        label: record.title,
        secondary: record.status,
        searchText: makeSearchText("行动", record.title, record.task_type, record.status, record.notes, related),
        record,
      };
    }
  }
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full max-w-sm justify-start gap-2 bg-card text-muted-foreground"
        aria-label="全局搜索"
      >
        <Search className="size-4" />
        <span className="truncate">搜索动画、片段、资源、方案…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] font-medium md:inline">Ctrl K</kbd>
      </Button>
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useAllData();
  const navigate = useNavigate();
  const forms = useForms();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const indexedData = useRef<AllData | null>(null);
  const deferredQuery = useDeferredValue(query);

  // Build the index only after opening. Small chunks let the dialog paint first
  // and prevent a large local dataset from monopolizing a single frame.
  useEffect(() => {
    if (!open || indexedData.current === data) return;

    let cancelled = false;
    let timeout: number | undefined;
    let completed = false;
    const nextEntries: SearchEntry[] = [];
    const sources: { kind: SearchKind; rows: unknown[] }[] = [
      { kind: "animation", rows: data.animations },
      { kind: "episode", rows: data.episodes },
      { kind: "clip", rows: data.clips },
      { kind: "lesson", rows: data.lessonPlans },
      { kind: "resource", rows: data.resources },
      { kind: "task", rows: data.tasks },
    ];
    let sourceIndex = 0;
    let rowIndex = 0;

    const buildChunk = () => {
      if (cancelled) return;
      const deadline = performance.now() + 8;
      let processed = 0;

      while (sourceIndex < sources.length && processed < 120 && performance.now() < deadline) {
        const source = sources[sourceIndex];
        if (rowIndex >= source.rows.length) {
          sourceIndex += 1;
          rowIndex = 0;
          continue;
        }
        nextEntries.push(makeSearchEntry(source.kind, source.rows[rowIndex], data));
        rowIndex += 1;
        processed += 1;
      }

      if (sourceIndex >= sources.length) {
        completed = true;
        indexedData.current = data;
        setEntries(nextEntries);
        return;
      }
      timeout = window.setTimeout(buildChunk, 0);
    };

    setEntries(null);
    timeout = window.setTimeout(buildChunk, 0);

    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (!completed && indexedData.current === data) indexedData.current = null;
    };
  }, [open, data]);

  const grouped = useMemo(() => {
    const result: Record<SearchKind, SearchEntry[]> = {
      animation: [],
      episode: [],
      clip: [],
      lesson: [],
      resource: [],
      task: [],
    };
    const terms = deferredQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!entries || terms.length === 0) return result;

    for (const entry of entries) {
      if (result[entry.kind].length >= MAX_RESULTS_PER_GROUP) continue;
      if (terms.every((term) => entry.searchText.includes(term))) result[entry.kind].push(entry);
      if (GROUPS.every((group) => result[group.kind].length >= MAX_RESULTS_PER_GROUP)) break;
    }
    return result;
  }, [entries, deferredQuery]);

  const resultCount = GROUPS.reduce((total, group) => total + grouped[group.kind].length, 0);

  const close = (nextOpen: boolean) => {
    if (!nextOpen) setQuery("");
    onOpenChange(nextOpen);
  };

  const selectEntry = (entry: SearchEntry) => {
    close(false);
    switch (entry.kind) {
      case "animation":
        navigate({ to: "/animations/$animationId", params: { animationId: entry.id } });
        break;
      case "episode":
        navigate({ to: "/episodes/$episodeId", params: { episodeId: entry.id } });
        break;
      case "clip":
        navigate({ to: "/clips", search: { clip: entry.id } });
        break;
      case "lesson":
        navigate({ to: "/lessons/$lessonId", params: { lessonId: entry.id }, search: { mode: "edit" } });
        break;
      case "resource":
        forms.openResource(entry.record);
        break;
      case "task":
        forms.openTask(entry.record);
        break;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={close} shouldFilter={false}>
      <CommandInput value={query} onValueChange={setQuery} placeholder="输入关键词搜索…" />
      <CommandList>
        <CommandEmpty>
          {!entries ? "正在准备搜索索引…" : query.trim() ? "没有找到匹配的记录" : "输入关键词开始搜索"}
        </CommandEmpty>
        {GROUPS.map((group) => {
          const matches = grouped[group.kind];
          if (matches.length === 0) return null;
          return (
            <CommandGroup key={group.kind} heading={group.heading}>
              {matches.map((entry) => (
                <CommandItem key={group.kind + ":" + entry.id} value={entry.searchText} onSelect={() => selectEntry(entry)}>
                  {entry.label}
                  {entry.secondary && <span className="ml-auto truncate text-xs text-muted-foreground">{entry.secondary}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      {resultCount > 0 && (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">最多显示每类 {MAX_RESULTS_PER_GROUP} 条匹配结果</p>
      )}
    </CommandDialog>
  );
}
