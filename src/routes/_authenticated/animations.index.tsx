import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Clapperboard,
  Film,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/app/form-bits";
import { PageHeader, EmptyState } from "@/components/app/states";
import { DemoBadge, ThemeChips } from "@/components/app/tone-badge";
import { useDeleteActions } from "@/components/app/delete-actions";
import { useForms } from "@/components/app/forms-context";
import { filterAndSortAnimations, type AnimationSort } from "@/lib/animation-catalog";
import { useAllData } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/animations/")({
  head: () => ({
    meta: [
      { title: "动画与集数 · 动画课堂 ClipLab" },
      { name: "description", content: "管理动画作品、集数和基础资料" },
    ],
  }),
  component: AnimationCatalogPage,
});

function AnimationCatalogPage() {
  const data = useAllData();
  const forms = useForms();
  const deleteActions = useDeleteActions();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const [sort, setSort] = useState<AnimationSort>("updated");

  const themes = useMemo(
    () => Array.from(new Set(data.animations.flatMap((a) => a.theme_tags))).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [data.animations],
  );
  const episodeCounts = useMemo(
    () => new Map(data.animations.map((a) => [a.id, data.episodesByAnimation.get(a.id)?.length ?? 0])),
    [data.animations, data.episodesByAnimation],
  );
  const filtered = useMemo(
    () => filterAndSortAnimations(data.animations, { query, theme, sort }, episodeCounts),
    [data.animations, query, theme, sort, episodeCounts],
  );

  const totalEpisodes = data.episodes.length;
  const totalClips = data.clips.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="动画与集数"
        description="先建立动画作品档案，再按作品整理集数；后续片段、资源和课堂方案都会关联到这里。"
        actions={
          <Button onClick={() => forms.openAnimation()}>
            <Plus className="size-4" />
            新增动画作品
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Film className="size-4" />动画作品</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{data.animations.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Tv className="size-4" />已登记集数</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{totalEpisodes}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Layers3 className="size-4" />已关联片段</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{totalClips}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索作品名称、别名、制作信息、简介或主题…"
              className="pl-9"
              aria-label="搜索动画作品"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:w-[360px]">
            <SimpleSelect
              value={theme}
              onChange={setTheme}
              options={themes}
              noneLabel="全部主题"
              placeholder="按主题筛选"
              ariaLabel="按主题筛选"
            />
            <SimpleSelect
              value={sort}
              onChange={(value) => setSort((value as AnimationSort) ?? "updated")}
              options={[
                { value: "updated", label: "最近更新" },
                { value: "name", label: "名称排序" },
                { value: "episodes", label: "集数最多" },
              ]}
              ariaLabel="排序方式"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>显示 {filtered.length} / {data.animations.length} 部作品</span>
          {(query || theme) && (
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => { setQuery(""); setTheme(null); }}
            >
              清除筛选
            </button>
          )}
        </div>
      </section>

      {data.animations.length === 0 ? (
        <EmptyState
          icon={<Clapperboard className="size-5" />}
          title="还没有动画作品"
          description="先添加一部动画作品，再在作品详情中登记集数。"
          action={<Button onClick={() => forms.openAnimation()}><Plus className="size-4" />新增第一部动画</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="没有找到匹配的动画"
          description="试试其他关键词，或清除主题筛选。"
          action={<Button variant="outline" onClick={() => { setQuery(""); setTheme(null); }}>清除筛选</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((animation) => {
            const episodes = episodeCounts.get(animation.id) ?? 0;
            const clips = data.clipsByAnimation.get(animation.id)?.length ?? 0;
            return (
              <article key={animation.id} className="flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Film className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <Link
                        to="/animations/$animationId"
                        params={{ animationId: animation.id }}
                        className="line-clamp-2 font-semibold text-foreground hover:text-primary"
                      >
                        {animation.name}
                      </Link>
                      {animation.production_info && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{animation.production_info}</p>
                      )}
                      <DemoBadge show={animation.is_demo} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label={`编辑${animation.name}`} title="编辑作品" onClick={() => forms.openAnimation(animation)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`删除${animation.name}`} title="删除作品" onClick={() => deleteActions.animation(animation)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <p className="mt-4 min-h-10 line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {animation.synopsis || "尚未填写作品简介。"}
                </p>

                <div className="mt-3 min-h-6">
                  <ThemeChips themes={animation.theme_tags} max={3} />
                </div>

                <div className="mt-4 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Tv className="size-3.5" />{episodes} 集</span>
                  <span className="inline-flex items-center gap-1"><Layers3 className="size-3.5" />{clips} 个片段</span>
                  <span className="ml-auto">{new Date(animation.updated_at).toLocaleDateString("zh-CN")}</span>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/animations/$animationId" params={{ animationId: animation.id }}>查看详情</Link>
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => forms.openEpisode(undefined, { animation_id: animation.id })}>
                    <Plus className="size-4" />添加集数
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
