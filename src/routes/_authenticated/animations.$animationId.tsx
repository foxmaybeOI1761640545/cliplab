import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clapperboard,
  Clock3,
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
import { PageHeader, EmptyState } from "@/components/app/states";
import { DemoBadge, ThemeChips } from "@/components/app/tone-badge";
import { useDeleteActions } from "@/components/app/delete-actions";
import { useForms } from "@/components/app/forms-context";
import { useAllData, episodeLabel } from "@/lib/db";
import { formatDuration } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/animations/$animationId")({
  head: () => ({
    meta: [
      { title: "动画详情 · 动画课堂 ClipLab" },
      { name: "description", content: "查看动画作品资料和所属集数" },
    ],
  }),
  component: AnimationDetailPage,
});

function AnimationDetailPage() {
  const { animationId } = Route.useParams();
  const data = useAllData();
  const navigate = useNavigate();
  const forms = useForms();
  const deleteActions = useDeleteActions();
  const [episodeQuery, setEpisodeQuery] = useState("");

  const animation = data.animationById.get(animationId);
  const episodes = useMemo(() => {
    const list = [...(data.episodesByAnimation.get(animationId) ?? [])];
    return list.sort((a, b) => {
      const season = (a.season ?? 0) - (b.season ?? 0);
      if (season !== 0) return season;
      const number = (a.episode_number ?? Number.MAX_SAFE_INTEGER) - (b.episode_number ?? Number.MAX_SAFE_INTEGER);
      if (number !== 0) return number;
      return (a.title ?? "").localeCompare(b.title ?? "", "zh-CN");
    });
  }, [data.episodesByAnimation, animationId]);
  const filteredEpisodes = useMemo(() => {
    const key = episodeQuery.trim().toLocaleLowerCase();
    if (!key) return episodes;
    return episodes.filter((episode) =>
      [episodeLabel(episode), episode.synopsis, episode.notes, episode.source_url]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(key),
    );
  }, [episodes, episodeQuery]);

  if (!animation) {
    return (
      <EmptyState
        icon={<Clapperboard className="size-5" />}
        title="没有找到这部动画"
        description="它可能已被删除，或当前链接不正确。"
        action={<Button asChild variant="outline"><Link to="/animations"><ArrowLeft className="size-4" />返回动画列表</Link></Button>}
      />
    );
  }

  const clipCount = data.clipsByAnimation.get(animation.id)?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={animation.name}
        description="动画作品档案"
        actions={
          <>
            <Button asChild variant="outline"><Link to="/animations"><ArrowLeft className="size-4" />返回列表</Link></Button>
            <Button variant="outline" onClick={() => forms.openAnimation(animation)}><Pencil className="size-4" />编辑作品</Button>
            <Button variant="destructive" onClick={() => deleteActions.animation(animation, () => navigate({ to: "/animations" }))}>
              <Trash2 className="size-4" />删除
            </Button>
          </>
        }
      />

      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Film className="size-7" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {animation.production_info && <span className="text-sm text-muted-foreground">{animation.production_info}</span>}
              <DemoBadge show={animation.is_demo} />
            </div>
            {animation.synopsis ? (
              <p className="whitespace-pre-wrap text-sm leading-6">{animation.synopsis}</p>
            ) : (
              <p className="text-sm text-muted-foreground">尚未填写作品简介。</p>
            )}
            <ThemeChips themes={animation.theme_tags} />
            {animation.aliases && <p className="text-sm"><span className="text-muted-foreground">别名：</span>{animation.aliases}</p>}
            {animation.notes && <p className="whitespace-pre-wrap text-sm"><span className="text-muted-foreground">备注：</span>{animation.notes}</p>}
            <div className="flex flex-wrap gap-4 border-t pt-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Tv className="size-4" />{episodes.length} 集</span>
              <span className="inline-flex items-center gap-1.5"><Layers3 className="size-4" />{clipCount} 个片段</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />更新于 {new Date(animation.updated_at).toLocaleString("zh-CN")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/clips" search={{ animation: animation.id }}>查看这部动画的片段</Link>
              </Button>
              <Button size="sm" onClick={() => forms.openClip(undefined, { animation_id: animation.id })}>
                <Plus className="size-4" />新增片段
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">集数管理</h2>
            <p className="mt-1 text-sm text-muted-foreground">按季和集数编号整理；集数可继续关联片段与资源。</p>
          </div>
          <Button onClick={() => forms.openEpisode(undefined, { animation_id: animation.id })}>
            <Plus className="size-4" />新增集数
          </Button>
        </div>

        {episodes.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={episodeQuery}
              onChange={(event) => setEpisodeQuery(event.target.value)}
              placeholder="搜索集数编号、标题或剧情梗概…"
              className="pl-9"
              aria-label="搜索当前动画的集数"
            />
          </div>
        )}

        {episodes.length === 0 ? (
          <EmptyState
            icon={<Tv className="size-5" />}
            title="这部动画还没有集数"
            description="添加集数编号、标题和整集时长，之后就能把课堂片段准确关联到具体集数。"
            action={<Button onClick={() => forms.openEpisode(undefined, { animation_id: animation.id })}><Plus className="size-4" />添加第一集</Button>}
          />
        ) : filteredEpisodes.length === 0 ? (
          <EmptyState title="没有找到匹配的集数" description="请换一个关键词再试试。" />
        ) : (
          <div className="space-y-3">
            {filteredEpisodes.map((episode) => {
              const clips = data.clipsByEpisode.get(episode.id)?.length ?? 0;
              return (
                <article key={episode.id} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/episodes/$episodeId"
                        params={{ episodeId: episode.id }}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {episodeLabel(episode)}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{formatDuration(episode.duration_seconds)}</span>
                        <span className="inline-flex items-center gap-1"><Layers3 className="size-3.5" />{clips} 个片段</span>
                      </div>
                      {episode.synopsis && <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-5 text-muted-foreground">{episode.synopsis}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => forms.openEpisode(episode)}>
                        <Pencil className="size-3.5" />编辑
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`删除${episodeLabel(episode)}`} title="删除集数" onClick={() => deleteActions.episode(episode)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
