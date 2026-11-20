import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FilePlus2, Link2, Plus, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/app/form-bits";
import { PageHeader, EmptyState, Section } from "@/components/app/states";
import { useForms } from "@/components/app/forms-context";
import { useDeleteActions } from "@/components/app/delete-actions";
import { episodeLabel, useAllData, type AllData, type Clip, type Resource } from "@/lib/db";
import { COPYRIGHT_STATUSES, PLAY_STATUSES, PLAYABLE_STATUSES } from "@/lib/constants";
import { DemoBadge, ToneBadge } from "@/components/app/tone-badge";
import {
  canOpenResourceUrl,
  getResourcePlayLabel,
  inspectResourceUrl,
  needsCopyrightVerification,
  needsPlayVerification,
} from "@/lib/resource-review";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "资源核实 · 动画课堂 ClipLab" },
      { name: "description", content: "核实动画播放链接、播放条件与课堂使用范围" },
      { property: "og:title", content: "资源核实 · ClipLab" },
      { property: "og:description", content: "核实动画播放链接、播放条件与课堂使用范围" },
    ],
  }),
  component: ResourceReviewPage,
});

type DemoFilter = "全部" | "真实数据" | "DEMO";

function ResourceReviewPage() {
  const data = useAllData();
  const forms = useForms();
  const deleteActions = useDeleteActions();
  const [query, setQuery] = useState("");
  const [playFilter, setPlayFilter] = useState("全部");
  const [copyrightFilter, setCopyrightFilter] = useState("全部");
  const [demoFilter, setDemoFilter] = useState<DemoFilter>("真实数据");
  const [showAllUnregistered, setShowAllUnregistered] = useState(false);

  const isDemoResource = (resource: Resource) => {
    const clip = resource.clip_id ? data.clipById.get(resource.clip_id) : undefined;
    const episode = resource.episode_id ? data.episodeById.get(resource.episode_id) : undefined;
    const animationId = resource.animation_id ?? clip?.animation_id ?? episode?.animation_id;
    const animation = animationId ? data.animationById.get(animationId) : undefined;
    return Boolean(resource.is_demo || clip?.is_demo || episode?.is_demo || animation?.is_demo);
  };

  const realResources = data.resources.filter((resource) => !isDemoResource(resource));
  const realClips = data.clips.filter((clip) => {
    const animation = data.animationById.get(clip.animation_id);
    const episode = clip.episode_id ? data.episodeById.get(clip.episode_id) : undefined;
    return !clip.is_demo && !animation?.is_demo && !episode?.is_demo;
  });
  const unregisteredClips = realClips.filter((clip) =>
    !data.resources.some((resource) => resource.clip_id === clip.id && !isDemoResource(resource)),
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return data.resources.filter((resource) => {
      if (demoFilter === "真实数据" && isDemoResource(resource)) return false;
      if (demoFilter === "DEMO" && !isDemoResource(resource)) return false;
      if (playFilter === "需要核实" && !needsPlayVerification(resource)) return false;
      if (playFilter !== "全部" && playFilter !== "需要核实" && resource.play_status !== playFilter) return false;
      if (copyrightFilter === "需要核实" && !needsCopyrightVerification(resource)) return false;
      if (copyrightFilter !== "全部" && copyrightFilter !== "需要核实" && resource.copyright_status !== copyrightFilter) return false;
      if (!term) return true;

      const clip = resource.clip_id ? data.clipById.get(resource.clip_id) : undefined;
      const episode = resource.episode_id ? data.episodeById.get(resource.episode_id) : undefined;
      const animationId = resource.animation_id ?? clip?.animation_id ?? episode?.animation_id;
      const animation = animationId ? data.animationById.get(animationId) : undefined;
      const haystack = [
        resource.platform,
        resource.url,
        resource.play_status,
        resource.copyright_status,
        resource.play_notes,
        resource.copyright_notes,
        clip?.name,
        animation?.name,
        episodeLabel(episode),
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      return haystack.includes(term);
    });
  }, [data.resources, data.clipById, data.episodeById, data.animationById, query, playFilter, copyrightFilter, demoFilter]);

  const pendingPlay = realResources.filter(needsPlayVerification).length;
  const pendingCopyright = realResources.filter(needsCopyrightVerification).length;
  const playable = realResources.filter((resource) =>
    !needsPlayVerification(resource) && PLAYABLE_STATUSES.includes(resource.play_status),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="资源核实"
        description="逐条检查真实播放链接、免费/登录/会员条件，并单独记录版权与课堂使用范围。系统不会把“能播放”自动等同于“可以用于课堂”。"
        actions={<Button onClick={() => forms.openResource()}><Plus className="size-4" />新增资源</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="真实资源记录" value={realResources.length} icon={<Link2 className="size-4" />} />
        <Stat label="播放待核实" value={pendingPlay} icon={<TriangleAlert className="size-4" />} />
        <Stat label="版权待确认" value={pendingCopyright} icon={<ShieldCheck className="size-4" />} />
        <Stat label="可免费播放" value={playable} icon={<ExternalLink className="size-4" />} />
      </div>

      <div className="rounded-xl border border-info/25 bg-info-soft/40 px-4 py-3 text-sm text-foreground">
        <p className="font-medium">两项核实必须分开</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          播放核实：链接是否真实、能否打开、是否免费或需要登录/会员。版权核实：是否适合学校课堂使用。免费可播放不代表已获得课堂使用许可。
        </p>
      </div>

      <Section
        title="尚未登记真实资源的片段"
        action={<ToneBadge tone={unregisteredClips.length ? "warning" : "success"}>{unregisteredClips.length} 个片段</ToneBadge>}
      >
        {unregisteredClips.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">目前所有真实片段都至少关联了一条非 DEMO 资源记录。</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {unregisteredClips.slice(0, showAllUnregistered ? unregisteredClips.length : 8).map((clip) => (
              <UnregisteredClip
                key={clip.id}
                clip={clip}
                animationName={data.animationById.get(clip.animation_id)?.name ?? "未关联动画"}
                episodeName={clip.episode_id ? episodeLabel(data.episodeById.get(clip.episode_id)) : "未指定集数"}
                onAdd={() => forms.openResource(undefined, { clip_id: clip.id })}
              />
            ))}
          </div>
        )}
        {unregisteredClips.length > 8 && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{showAllUnregistered ? "已显示全部未登记片段" : "另有 " + (unregisteredClips.length - 8) + " 个片段未展开"}</p>
            <Button size="sm" variant="ghost" onClick={() => setShowAllUnregistered((value) => !value)}>
              {showAllUnregistered ? "收起" : "显示全部"}
            </Button>
          </div>
        )}
      </Section>

      <Section title="资源记录" action={<span className="text-xs text-muted-foreground">共显示 {filtered.length} 条</span>}>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="搜索作品、片段、平台或链接…" aria-label="搜索资源" />
          </div>
          <SimpleSelect value={playFilter} onChange={(value) => setPlayFilter(value ?? "全部")} options={["全部", "需要核实", ...PLAY_STATUSES]} ariaLabel="按播放状态筛选" />
          <SimpleSelect value={copyrightFilter} onChange={(value) => setCopyrightFilter(value ?? "全部")} options={["全部", "需要核实", ...COPYRIGHT_STATUSES]} ariaLabel="按版权状态筛选" />
          <SimpleSelect value={demoFilter} onChange={(value) => setDemoFilter((value as DemoFilter) ?? "全部")} options={["全部", "真实数据", "DEMO"]} ariaLabel="按数据类型筛选" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FilePlus2 className="size-5" />}
            title="没有符合条件的资源记录"
            description={data.resources.length ? "试试调整筛选条件，或为片段新增实际播放资源。" : "先新增一条实际资源记录，再分别核实播放状态和课堂使用范围。"}
            action={<Button onClick={() => forms.openResource()}><Plus className="size-4" />新增资源</Button>}
          />
        ) : (
          <div className="performance-list grid gap-3 xl:grid-cols-2">
            {filtered.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                data={data}
                onEdit={() => forms.openResource(resource)}
                onDelete={() => deleteActions.resource(resource)}
                onCreateTask={() => {
                  const clip = resource.clip_id ? data.clipById.get(resource.clip_id) : undefined;
                  const title = clip?.name ?? resource.platform ?? "资源";
                  const needsPlay = needsPlayVerification(resource);
                  const linkState = inspectResourceUrl(resource.url);
                  forms.openTask(undefined, {
                    title: (needsPlay ? "核实播放资源：" : "确认课堂使用范围：") + title,
                    task_type: needsPlay ? (linkState === "ready" ? "核实播放" : "更换链接") : "确认版权",
                    priority: needsPlay && linkState !== "ready" ? "高" : "中",
                    animation_id: resource.animation_id,
                    episode_id: resource.episode_id,
                    clip_id: resource.clip_id,
                    notes: "来源资源记录：" + (resource.platform || "未填写平台") + " · " + (resource.url || "未填写链接"),
                  });
                }}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function UnregisteredClip({
  clip,
  animationName,
  episodeName,
  onAdd,
}: {
  clip: Clip;
  animationName: string;
  episodeName: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{clip.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{animationName} · {episodeName}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onAdd} className="shrink-0"><Plus className="size-3.5" />添加资源</Button>
    </div>
  );
}

function ResourceCard({
  resource,
  data,
  onEdit,
  onDelete,
  onCreateTask,
}: {
  resource: Resource;
  data: AllData;
  onEdit: () => void;
  onDelete: () => void;
  onCreateTask: () => void;
}) {
  const clip = resource.clip_id ? data.clipById.get(resource.clip_id) : undefined;
  const episode = resource.episode_id ? data.episodeById.get(resource.episode_id) : undefined;
  const animationId = resource.animation_id ?? clip?.animation_id ?? episode?.animation_id;
  const animation = animationId ? data.animationById.get(animationId) : undefined;
  const linkState = inspectResourceUrl(resource.url);
  const isDemo = Boolean(resource.is_demo || clip?.is_demo || episode?.is_demo || animation?.is_demo);
  const playNeedsReview = needsPlayVerification(resource);
  const copyrightNeedsReview = needsCopyrightVerification(resource);
  const playTone = linkState === "placeholder" || linkState === "invalid"
    ? "danger"
    : playNeedsReview ? "warning"
      : PLAYABLE_STATUSES.includes(resource.play_status) ? "success" : "neutral";

  return (
    <article className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{clip?.name ?? (episode ? episodeLabel(episode) : animation?.name ?? resource.platform ?? "未命名资源")}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {[animation?.name, episode ? episodeLabel(episode) : null, resource.platform].filter(Boolean).join(" · ") || "未关联对象"}
          </p>
        </div>
        <DemoBadge show={isDemo} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ToneBadge tone={playTone}>播放：{getResourcePlayLabel(resource)}</ToneBadge>
        <ToneBadge tone={copyrightNeedsReview ? "warning" : resource.copyright_status === "不建议使用" ? "danger" : resource.copyright_status === "已确认可用于课堂" ? "success" : "neutral"}>
          课堂使用：{resource.copyright_status}
        </ToneBadge>
      </div>

      {resource.url ? (
        <div className="flex min-w-0 items-start gap-2 text-xs">
          <Link2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 break-all text-muted-foreground">{resource.url}</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">尚未填写实际播放链接</p>
      )}

      {(linkState === "placeholder" || linkState === "invalid") && (
        <p className="flex items-start gap-1.5 rounded-md bg-warning-soft px-2.5 py-2 text-xs text-warning">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {linkState === "placeholder" ? "这是占位域名，不能视为真实播放资源，也不会提供打开入口。" : "链接格式无效或不是 HTTP(S) 地址，请检查后再核实。"}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 md:flex-nowrap md:gap-3">
        <p
          className="min-w-0 text-[11px] text-muted-foreground md:flex-1 md:truncate md:whitespace-nowrap"
          title={[resource.verified_at ? "核实日期：" + resource.verified_at : "尚无核实日期", resource.verifier].filter(Boolean).join(" · ")}
        >
          {resource.verified_at ? "核实日期：" + resource.verified_at : "尚无核实日期"}
          {resource.verifier ? " · " + resource.verifier : ""}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5 md:shrink-0 md:flex-nowrap">
          {canOpenResourceUrl(resource.url) ? (
            <Button asChild size="sm" variant="outline">
              <a href={resource.url!} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" />打开链接</a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled title="请先填写真实 HTTP(S) 播放链接"><ExternalLink className="size-3.5" />打开链接</Button>
          )}
          {(playNeedsReview || copyrightNeedsReview) && (
            <Button size="sm" variant="outline" onClick={onCreateTask}>转为行动</Button>
          )}
          <Button size="sm" onClick={onEdit}>更新核实</Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={onDelete} aria-label="删除资源记录">
            <span className="text-destructive">×</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
