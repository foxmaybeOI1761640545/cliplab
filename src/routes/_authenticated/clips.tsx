import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpenCheck,
  Clock3,
  Film,
  Layers3,
  MessageCircleQuestion,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimpleSelect } from "@/components/app/form-bits";
import { PageHeader, EmptyState, InfoRow } from "@/components/app/states";
import {
  ClipStatusBadge,
  CopyrightBadge,
  DemoBadge,
  PlayBadge,
  StageBadge,
  ThemeChips,
} from "@/components/app/tone-badge";
import { useDeleteActions } from "@/components/app/delete-actions";
import { useConfirm } from "@/components/app/confirm-context";
import { useForms } from "@/components/app/forms-context";
import {
  clipPlayMinutes,
  clipSeconds,
  episodeLabel,
  summarizeResources,
  useAllData,
  useDb,
  type Clip,
} from "@/lib/db";
import {
  CLIP_STATUSES,
  COPYRIGHT_STATUSES,
  GRADES,
  PLAY_STATUSES,
  PRESET_THEMES,
  STAGES,
} from "@/lib/constants";
import { formatDuration, formatMinutes, formatTimecode } from "@/lib/time";
import { filterAndSortClips, type ClipCatalogSort } from "@/lib/clip-catalog";

type ClipSearch = { clip?: string; animation?: string; episode?: string };

export const Route = createFileRoute("/_authenticated/clips")({
  validateSearch: (s: Record<string, unknown>): ClipSearch => ({
    clip: typeof s.clip === "string" ? s.clip : undefined,
    animation: typeof s.animation === "string" ? s.animation : undefined,
    episode: typeof s.episode === "string" ? s.episode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "片段库 · 动画课堂 ClipLab" },
      { name: "description", content: "管理课堂动画片段、时间码、主题和教学设计" },
      { property: "og:title", content: "片段库 · ClipLab" },
      { property: "og:description", content: "管理课堂动画片段、时间码、主题和教学设计" },
    ],
  }),
  component: ClipLibraryPage,
});

function ClipLibraryPage() {
  const data = useAllData();
  const forms = useForms();
  const deleteActions = useDeleteActions();
  const confirm = useConfirm();
  const db = useDb();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [query, setQuery] = useState("");
  const [animationId, setAnimationId] = useState<string | null>(search.animation ?? null);
  const [episodeId, setEpisodeId] = useState<string | null>(search.episode ?? null);
  const [theme, setTheme] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [playStatus, setPlayStatus] = useState<string | null>(null);
  const [copyrightStatus, setCopyrightStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<ClipCatalogSort>("updated");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const routeAnimationId = search.animation ??
    (search.episode ? data.episodeById.get(search.episode)?.animation_id : undefined);

  useEffect(() => {
    setAnimationId(routeAnimationId ?? null);
    setEpisodeId(search.episode ?? null);
  }, [routeAnimationId, search.episode]);

  const catalog = useMemo(
    () => data.clips.map((clip) => {
      const animation = data.animationById.get(clip.animation_id);
      const episode = clip.episode_id ? data.episodeById.get(clip.episode_id) : undefined;
      const resources = data.resourcesByClip.get(clip.id) ?? [];
      return {
        ...clip,
        animation_name: animation?.name ?? "",
        episode_label: episodeLabel(episode),
        resource_play_statuses: resources.map((resource) => resource.play_status),
        resource_copyright_statuses: resources.map((resource) => resource.copyright_status),
      };
    }),
    [data.clips, data.animationById, data.episodeById, data.resourcesByClip],
  );

  const filtered = useMemo(
    () => filterAndSortClips(catalog, {
      query,
      animationId,
      episodeId,
      theme,
      stage,
      grade,
      status,
      playStatus,
      copyrightStatus,
      sort,
    }),
    [catalog, query, animationId, episodeId, theme, stage, grade, status, playStatus, copyrightStatus, sort],
  );

  const selectedVisible = filtered.filter((clip) => selectedIds.has(clip.id));
  const allVisibleSelected = filtered.length > 0 && selectedVisible.length === filtered.length;
  const visibleIdsKey = filtered.map((clip) => clip.id).join("|");

  useEffect(() => {
    const visible = new Set(filtered.map((clip) => clip.id));
    setSelectedIds((previous) => new Set([...previous].filter((id) => visible.has(id))));
  }, [visibleIdsKey]);

  const themes = useMemo(
    () => Array.from(new Set([...PRESET_THEMES, ...data.clips.flatMap((clip) => clip.themes ?? [])]))
      .sort((a, b) => a.localeCompare(b, "zh-CN")),
    [data.clips],
  );
  const grades = useMemo(
    () => Array.from(new Set([...GRADES, ...data.clips.map((clip) => clip.grade).filter(Boolean)])),
    [data.clips],
  );
  const episodesForFilter = useMemo(
    () => data.episodes
      .filter((episode) => !animationId || episode.animation_id === animationId)
      .map((episode) => ({
        value: episode.id,
        label: (data.animationById.get(episode.animation_id)?.name ?? "未知动画") + " · " + episodeLabel(episode),
      })),
    [data.episodes, data.animationById, animationId],
  );

  const selectedClip = search.clip ? data.clipById.get(search.clip) : undefined;
  const selectedAnimation = selectedClip ? data.animationById.get(selectedClip.animation_id) : undefined;
  const selectedEpisode = selectedClip?.episode_id ? data.episodeById.get(selectedClip.episode_id) : undefined;
  const selectedResources = selectedClip ? (data.resourcesByClip.get(selectedClip.id) ?? []) : [];

  useEffect(() => {
    if (search.clip && !data.clipById.has(search.clip)) {
      navigate({ to: "/clips", search: (previous) => ({ ...previous, clip: undefined }), replace: true });
    }
  }, [search.clip, data.clipById, navigate]);

  const openDetails = (clip: Clip) => {
    navigate({ to: "/clips", search: (previous) => ({ ...previous, clip: clip.id }) });
  };
  const closeDetails = () => {
    navigate({ to: "/clips", search: (previous) => ({ ...previous, clip: undefined }) });
  };
  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const clip of filtered) {
        if (checked) next.add(clip.id);
        else next.delete(clip.id);
      }
      return next;
    });
  };

  const bulkSetStatus = async (nextStatus: string) => {
    const ids = selectedVisible.map((clip) => clip.id);
    if (!ids.length) return;
    try {
      await Promise.all(ids.map((id) => db.update("clips", id, { status: nextStatus })));
      toast.success("已将 " + ids.length + " 个片段设为「" + nextStatus + "」");
      setSelectedIds(new Set());
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const bulkDelete = () => {
    const ids = selectedVisible.map((clip) => clip.id);
    if (!ids.length) return;
    confirm({
      title: "删除选中的 " + ids.length + " 个片段？",
      description: (
        <div className="space-y-2">
          <p>此操作不可撤销。</p>
          <p>关联的资源记录、课堂流程文字和备课行动会保留，但会解除与这些片段的关联。</p>
        </div>
      ),
      confirmLabel: "删除所选片段",
      onConfirm: async () => {
        await db.remove("clips", ids);
        setSelectedIds(new Set());
        toast.success("已删除 " + ids.length + " 个片段");
      },
    });
  };

  const clearFilters = () => {
    setQuery("");
    setAnimationId(null);
    setEpisodeId(null);
    setTheme(null);
    setStage(null);
    setGrade(null);
    setStatus(null);
    setPlayStatus(null);
    setCopyrightStatus(null);
    setSort("updated");
    setSelectedIds(new Set());
    navigate({
      to: "/clips",
      search: (previous) => ({ ...previous, animation: undefined, episode: undefined }),
    });
  };

  const pendingResourceCount = data.clips.filter((clip) =>
    (data.resourcesByClip.get(clip.id) ?? []).some((resource) =>
      resource.play_status === "待核实" || resource.copyright_status === "待核实",
    ),
  ).length;

  const editSelectedClip = () => {
    if (!selectedClip) return;
    const record = selectedClip;
    closeDetails();
    forms.openClip(record);
  };

  const addSelectedResource = () => {
    if (!selectedClip) return;
    const defaults = {
      animation_id: selectedClip.animation_id,
      episode_id: selectedClip.episode_id ?? undefined,
      clip_id: selectedClip.id,
    };
    closeDetails();
    forms.openResource(undefined, defaults);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="片段库"
        description="把整集拆成适合课堂使用的短片段，集中管理时间码、主题、课堂阶段与教学设计。"
        actions={
          <Button onClick={() => forms.openClip(undefined, {
            animation_id: animationId ?? undefined,
            episode_id: episodeId ?? undefined,
          })}>
            <Plus className="size-4" />新增片段
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Layers3 className="size-4" />片段总数</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{data.clips.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpenCheck className="size-4" />可用片段</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{data.clips.filter((clip) => clip.status === "可用").length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />待剪辑</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{data.clips.filter((clip) => clip.status === "待剪辑").length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><SlidersHorizontal className="size-4" />资源待核实</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{pendingResourceCount}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索片段名称、动画、集数、提问、讨论目标或剪辑提示…"
            className="pl-9"
            aria-label="搜索片段"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <SimpleSelect
            value={animationId}
            onChange={(value) => { setAnimationId(value); setEpisodeId(null); }}
            options={data.animations.map((animation) => ({ value: animation.id, label: animation.name }))}
            noneLabel="全部动画"
            ariaLabel="按动画筛选"
          />
          <SimpleSelect
            value={episodeId}
            onChange={(value) => {
              setEpisodeId(value);
              const episode = value ? data.episodeById.get(value) : undefined;
              if (episode) setAnimationId(episode.animation_id);
            }}
            options={episodesForFilter}
            noneLabel="全部集数"
            ariaLabel="按集数筛选"
          />
          <SimpleSelect value={theme} onChange={setTheme} options={themes} noneLabel="全部主题" ariaLabel="按主题筛选" />
          <SimpleSelect
            value={stage}
            onChange={setStage}
            options={[...STAGES, { value: "未设阶段", label: "未设阶段" }]}
            noneLabel="全部课堂阶段"
            ariaLabel="按课堂阶段筛选"
          />
          <SimpleSelect value={grade} onChange={setGrade} options={grades} noneLabel="全部年级" ariaLabel="按年级筛选" />
          <SimpleSelect value={status} onChange={setStatus} options={CLIP_STATUSES} noneLabel="全部片段状态" ariaLabel="按片段状态筛选" />
          <SimpleSelect
            value={playStatus}
            onChange={setPlayStatus}
            options={[...PLAY_STATUSES, { value: "未登记", label: "未登记资源" }]}
            noneLabel="全部播放状态"
            ariaLabel="按播放可用性筛选"
          />
          <SimpleSelect
            value={copyrightStatus}
            onChange={setCopyrightStatus}
            options={[...COPYRIGHT_STATUSES, { value: "未登记", label: "未登记版权状态" }]}
            noneLabel="全部版权状态"
            ariaLabel="按版权状态筛选"
          />
        </div>
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            显示 {filtered.length} / {data.clips.length} 个片段
            {selectedVisible.length > 0 ? " · 已选 " + selectedVisible.length + " 个" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SimpleSelect
              value={sort}
              onChange={(value) => setSort((value as ClipCatalogSort) ?? "updated")}
              options={[
                { value: "updated", label: "最近更新" },
                { value: "name", label: "名称排序" },
                { value: "start", label: "按开始时间" },
                { value: "duration-desc", label: "时长从长到短" },
                { value: "duration-asc", label: "时长从短到长" },
              ]}
              ariaLabel="片段排序方式"
              className="w-[150px]"
            />
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-3.5" />清空筛选
            </Button>
          </div>
        </div>
      </section>

      {selectedVisible.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary-soft/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => toggleAllVisible(checked === true)} aria-label="选择当前筛选结果中的全部片段" />
            已选择 {selectedVisible.length} 个片段
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">批量修改状态</span>
            <SimpleSelect
              value={null}
              onChange={(value) => { if (value) void bulkSetStatus(value); }}
              options={CLIP_STATUSES}
              placeholder="选择新状态"
              ariaLabel="批量修改片段状态"
              className="w-[150px] bg-card"
            />
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="size-3.5" />删除所选
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
          </div>
        </section>
      )}

      {data.clips.length === 0 ? (
        <EmptyState
          icon={<Film className="size-5" />}
          title="片段库还是空的"
          description="先登记动画作品和集数，再把适合课堂使用的几分钟片段拆出来。也可以直接新增片段并关联已有动画。"
          action={<Button onClick={() => forms.openClip()}><Plus className="size-4" />新增第一个片段</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="没有找到符合条件的片段"
          description="试试换一个关键词，或者清除部分筛选条件。"
          action={<Button variant="outline" onClick={clearFilters}>清空筛选</Button>}
        />
      ) : (
        <Tabs value={view} onValueChange={(value) => setView(value as "cards" | "table")} className="space-y-4">
          <div className="flex justify-end">
            <TabsList>
              <TabsTrigger value="cards">卡片视图</TabsTrigger>
              <TabsTrigger value="table">表格视图</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cards" className="mt-0">
            <div className="grid gap-3 lg:grid-cols-2">
              {filtered.map((clip) => {
                const animation = data.animationById.get(clip.animation_id);
                const episode = clip.episode_id ? data.episodeById.get(clip.episode_id) : undefined;
                const resourceSummary = summarizeResources(data.resourcesByClip.get(clip.id));
                const duration = clipSeconds(clip);
                return (
                  <article key={clip.id} className="min-w-0 rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/35">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(clip.id)}
                        onCheckedChange={(checked) => toggleSelected(clip.id, checked === true)}
                        aria-label={"选择片段 " + clip.name}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <button type="button" onClick={() => openDetails(clip)} className="text-left font-semibold text-foreground hover:text-primary">
                              {clip.name}
                            </button>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              {animation ? (
                                <Link to="/animations/$animationId" params={{ animationId: animation.id }} className="inline-flex items-center gap-1 hover:text-primary">
                                  <Film className="size-3.5" />{animation.name}
                                </Link>
                              ) : <span>动画未关联</span>}
                              <span>·</span>
                              {episode ? (
                                <Link to="/episodes/$episodeId" params={{ episodeId: episode.id }} className="hover:text-primary">{episodeLabel(episode)}</Link>
                              ) : <span>未指定集数</span>}
                            </div>
                          </div>
                          <ClipStatusBadge value={clip.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                          <StageBadge value={clip.stage} />
                          <span>{clip.grade || "未设年级"}</span>
                          <span className="inline-flex items-center gap-1 font-timecode">
                            <Clock3 className="size-3.5" />
                            {formatTimecode(clip.start_seconds) || "未设开始"} – {formatTimecode(clip.end_seconds) || "未设结束"}
                          </span>
                          <span>片段 {formatDuration(duration)}</span>
                          <span>课堂播放 {formatMinutes(clipPlayMinutes(clip))}</span>
                        </div>

                        <ThemeChips themes={clip.themes} max={5} />

                        {clip.highlight_notes && (
                          <p className="line-clamp-2 whitespace-pre-wrap text-sm leading-5 text-muted-foreground">{clip.highlight_notes}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                          <PlayBadge value={resourceSummary.play} />
                          <CopyrightBadge value={resourceSummary.copyright} />
                          <DemoBadge show={clip.is_demo} />
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetails(clip)}>查看教学设计</Button>
                          <Button variant="ghost" size="sm" onClick={() => forms.openClip(clip)}><Pencil className="size-3.5" />编辑</Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteActions.clip(clip)}><Trash2 className="size-3.5 text-destructive" />删除</Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-0">
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table className="min-w-[1050px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                        aria-label="选择当前筛选结果中的全部片段"
                      />
                    </TableHead>
                    <TableHead>片段</TableHead>
                    <TableHead>动画 / 集数</TableHead>
                    <TableHead>课堂阶段</TableHead>
                    <TableHead>主题</TableHead>
                    <TableHead>时间码 / 时长</TableHead>
                    <TableHead>播放 / 版权</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((clip) => {
                    const animation = data.animationById.get(clip.animation_id);
                    const episode = clip.episode_id ? data.episodeById.get(clip.episode_id) : undefined;
                    const resourceSummary = summarizeResources(data.resourcesByClip.get(clip.id));
                    return (
                      <TableRow key={clip.id} data-state={selectedIds.has(clip.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(clip.id)}
                            onCheckedChange={(checked) => toggleSelected(clip.id, checked === true)}
                            aria-label={"选择片段 " + clip.name}
                          />
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <button type="button" onClick={() => openDetails(clip)} className="line-clamp-2 text-left font-medium hover:text-primary">{clip.name}</button>
                          <p className="mt-1 text-xs text-muted-foreground">{clip.grade || "未设年级"} · 课堂播放 {formatMinutes(clipPlayMinutes(clip))}</p>
                        </TableCell>
                        <TableCell className="max-w-[190px]">
                          <p className="truncate">{animation?.name ?? "未关联动画"}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{episodeLabel(episode)}</p>
                        </TableCell>
                        <TableCell><StageBadge value={clip.stage} /></TableCell>
                        <TableCell className="max-w-[150px]"><ThemeChips themes={clip.themes} max={2} /></TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="font-timecode text-xs">{formatTimecode(clip.start_seconds) || "—"} – {formatTimecode(clip.end_seconds) || "—"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDuration(clipSeconds(clip))}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <PlayBadge value={resourceSummary.play} />
                            <CopyrightBadge value={resourceSummary.copyright} />
                          </div>
                        </TableCell>
                        <TableCell><ClipStatusBadge value={clip.status} /></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" aria-label={"查看 " + clip.name} onClick={() => openDetails(clip)}><BookOpenCheck className="size-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label={"编辑 " + clip.name} onClick={() => forms.openClip(clip)}><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label={"删除 " + clip.name} onClick={() => deleteActions.clip(clip)}><Trash2 className="size-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={Boolean(selectedClip)} onOpenChange={(open) => { if (!open) closeDetails(); }}>
        {selectedClip && (
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-8">{selectedClip.name}</DialogTitle>
              <DialogDescription>片段教学设计与关联资源</DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <ClipStatusBadge value={selectedClip.status} />
              <StageBadge value={selectedClip.stage} />
              <DemoBadge show={selectedClip.is_demo} />
              <ThemeChips themes={selectedClip.themes} />
            </div>

            <section className="rounded-lg border p-3">
              <h3 className="mb-2 text-sm font-semibold">基本信息</h3>
              <dl className="divide-y">
                <InfoRow label="动画作品">
                  {selectedAnimation ? <Link to="/animations/$animationId" params={{ animationId: selectedAnimation.id }} className="text-primary hover:underline">{selectedAnimation.name}</Link> : "未关联"}
                </InfoRow>
                <InfoRow label="集数">
                  {selectedEpisode ? <Link to="/episodes/$episodeId" params={{ episodeId: selectedEpisode.id }} className="text-primary hover:underline">{episodeLabel(selectedEpisode)}</Link> : "未指定"}
                </InfoRow>
                <InfoRow label="适用年级">{selectedClip.grade}</InfoRow>
                <InfoRow label="开始时间">{formatTimecode(selectedClip.start_seconds) || "未填写"}</InfoRow>
                <InfoRow label="结束时间">{formatTimecode(selectedClip.end_seconds) || "未填写"}</InfoRow>
                <InfoRow label="片段时长">{formatDuration(clipSeconds(selectedClip))}</InfoRow>
                <InfoRow label="适合课堂播放">{formatMinutes(clipPlayMinutes(selectedClip))}</InfoRow>
                <InfoRow label="预计课堂用时">{formatMinutes(selectedClip.est_class_minutes == null ? null : Number(selectedClip.est_class_minutes))}</InfoRow>
              </dl>
            </section>

            <section className="space-y-3 rounded-lg border p-3">
              <h3 className="text-sm font-semibold">教学设计</h3>
              <DetailText icon={<MessageCircleQuestion className="size-4" />} label="教师提问" value={selectedClip.questions} />
              <DetailText icon={<Target className="size-4" />} label="讨论目标" value={selectedClip.discussion_goal} />
              <DetailText icon={<BookOpenCheck className="size-4" />} label="总结陈述" value={selectedClip.summary} />
              <DetailText icon={<Film className="size-4" />} label="重点画面 / 剪辑提示" value={selectedClip.highlight_notes} />
              <DetailText icon={<Tv className="size-4" />} label="教学备注" value={selectedClip.teaching_notes} />
            </section>

            <section className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">关联资源</h3>
                  <p className="mt-1 text-xs text-muted-foreground">播放可用性与版权状态分别核实，不会自动推断。</p>
                </div>
                <Button size="sm" variant="outline" onClick={addSelectedResource}><Plus className="size-3.5" />新增资源</Button>
              </div>
              {selectedResources.length === 0 ? (
                <p className="rounded-md bg-muted/50 px-3 py-4 text-sm text-muted-foreground">尚未关联资源。可以添加实际链接，并手动记录播放与版权核实结果。</p>
              ) : (
                <div className="space-y-2">
                  {selectedResources.map((resource) => (
                    <article key={resource.id} className="space-y-2 rounded-md bg-muted/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{resource.platform || "未填写平台"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <PlayBadge value={resource.play_status} />
                          <CopyrightBadge value={resource.copyright_status} />
                        </div>
                      </div>
                      {resource.url ? (
                        <a href={resource.url} target="_blank" rel="noreferrer" className="break-all text-sm text-primary hover:underline">{resource.url}</a>
                      ) : <p className="text-xs text-muted-foreground">未填写实际播放链接</p>}
                      {resource.verified_at && <p className="text-xs text-muted-foreground">核实日期：{resource.verified_at}{resource.verifier ? " · " + resource.verifier : ""}</p>}
                      {resource.play_notes && <p className="whitespace-pre-wrap text-xs text-muted-foreground">播放备注：{resource.play_notes}</p>}
                      {resource.copyright_notes && <p className="whitespace-pre-wrap text-xs text-muted-foreground">版权/平台备注：{resource.copyright_notes}</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="destructive" onClick={() => deleteActions.clip(selectedClip, closeDetails)}>
                <Trash2 className="size-4" />删除片段
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={closeDetails}>关闭</Button>
                <Button onClick={editSelectedClip}><Pencil className="size-4" />编辑片段</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function DetailText({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">{icon}{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-6">{value?.trim() ? value : <span className="text-muted-foreground">尚未填写</span>}</p>
    </div>
  );
}
