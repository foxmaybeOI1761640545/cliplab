import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Film,
  Layers3,
  Pencil,
  Trash2,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/app/states";
import { ClipStatusBadge, StageBadge, ThemeChips } from "@/components/app/tone-badge";
import { useDeleteActions } from "@/components/app/delete-actions";
import { useForms } from "@/components/app/forms-context";
import { episodeLabel, useAllData } from "@/lib/db";
import { formatDuration, formatTimecode } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/episodes/$episodeId")({
  head: () => ({
    meta: [
      { title: "集数详情 · 动画课堂 ClipLab" },
      { name: "description", content: "查看集数资料和关联片段" },
    ],
  }),
  component: EpisodeDetailPage,
});

function EpisodeDetailPage() {
  const { episodeId } = Route.useParams();
  const data = useAllData();
  const navigate = useNavigate();
  const forms = useForms();
  const deleteActions = useDeleteActions();
  const episode = data.episodeById.get(episodeId);

  if (!episode) {
    return (
      <EmptyState
        icon={<Tv className="size-5" />}
        title="没有找到这条集数记录"
        description="它可能已被删除，或当前链接不正确。"
        action={<Button asChild variant="outline"><Link to="/animations"><ArrowLeft className="size-4" />返回动画列表</Link></Button>}
      />
    );
  }

  const animation = data.animationById.get(episode.animation_id);
  const clips = data.clipsByEpisode.get(episode.id) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={episodeLabel(episode)}
        description={animation ? `所属动画：${animation.name}` : "集数详情"}
        actions={
          <>
            {animation && (
              <Button asChild variant="outline">
                <Link to="/animations/$animationId" params={{ animationId: animation.id }}><ArrowLeft className="size-4" />返回动画</Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => forms.openEpisode(episode)}><Pencil className="size-4" />编辑集数</Button>
            <Button
              variant="destructive"
              onClick={() => deleteActions.episode(episode, () => navigate({
                to: animation ? "/animations/$animationId" : "/animations",
                params: animation ? { animationId: animation.id } : undefined,
              }))}
            >
              <Trash2 className="size-4" />删除
            </Button>
          </>
        }
      />

      <section className="rounded-xl border bg-card p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">所属动画</p>
            {animation ? (
              <Link to="/animations/$animationId" params={{ animationId: animation.id }} className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <Film className="size-4" />{animation.name}
              </Link>
            ) : <p className="mt-1 text-sm text-muted-foreground">关联动画不存在</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">整集时长</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium"><Clock3 className="size-4 text-muted-foreground" />{formatDuration(episode.duration_seconds)}</p>
          </div>
          {episode.synopsis && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">剧情梗概</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{episode.synopsis}</p>
            </div>
          )}
          {episode.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">备注</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{episode.notes}</p>
            </div>
          )}
          {episode.source_url && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">原始资源链接</p>
              <a href={episode.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-sm text-primary hover:underline">
                {episode.source_url}<ExternalLink className="size-3.5 shrink-0" />
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">关联片段</h2>
            <p className="mt-1 text-sm text-muted-foreground">这集目前登记了 {clips.length} 个片段。</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/clips">打开片段库</Link></Button>
        </div>
        {clips.length === 0 ? (
          <EmptyState
            icon={<Layers3 className="size-5" />}
            title="这集还没有关联片段"
            description="后续可以在片段库中为这部动画的具体集数建立课堂片段。"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {clips.map((clip) => (
              <article key={clip.id} className="space-y-3 rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{clip.name}</h3>
                  <ClipStatusBadge value={clip.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <StageBadge value={clip.stage} />
                  <span className="font-timecode">{formatTimecode(clip.start_seconds) || "未设开始"} – {formatTimecode(clip.end_seconds) || "未设结束"}</span>
                </div>
                <ThemeChips themes={clip.themes} max={4} />
                {clip.highlight_notes && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{clip.highlight_notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
