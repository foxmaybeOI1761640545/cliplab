import { useEffect, useState } from "react";
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
import { episodeLabel, useAllData } from "@/lib/db";
import { useForms } from "./forms-context";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const data = useAllData();
  const navigate = useNavigate();
  const forms = useForms();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

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
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="输入关键词搜索…" />
        <CommandList>
          <CommandEmpty>没有找到匹配的记录</CommandEmpty>
          {data.animations.length > 0 && (
            <CommandGroup heading="动画作品">
              {data.animations.map((a) => (
                <CommandItem key={a.id} value={`动画 ${a.name} ${a.aliases ?? ""} ${a.theme_tags.join(" ")}`} onSelect={() => go(() => navigate({ to: "/animations/$animationId", params: { animationId: a.id } }))}>
                  {a.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data.episodes.length > 0 && (
            <CommandGroup heading="集数">
              {data.episodes.map((e) => {
                const an = data.animationById.get(e.animation_id)?.name ?? "";
                return (
                  <CommandItem key={e.id} value={`集 ${an} ${episodeLabel(e)} ${e.synopsis ?? ""}`} onSelect={() => go(() => navigate({ to: "/episodes/$episodeId", params: { episodeId: e.id } }))}>
                    <span className="text-muted-foreground">{an}</span> {episodeLabel(e)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          {data.clips.length > 0 && (
            <CommandGroup heading="片段">
              {data.clips.map((c) => (
                <CommandItem key={c.id} value={`片段 ${c.name} ${c.themes.join(" ")} ${c.questions ?? ""} ${c.stage ?? ""}`} onSelect={() => go(() => navigate({ to: "/clips", search: { clip: c.id } }))}>
                  {c.name}
                  <span className="ml-auto text-xs text-muted-foreground">{data.animationById.get(c.animation_id)?.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data.lessonPlans.length > 0 && (
            <CommandGroup heading="课堂方案">
              {data.lessonPlans.map((l) => (
                <CommandItem key={l.id} value={`方案 ${l.title} ${l.theme ?? ""}`} onSelect={() => go(() => navigate({ to: "/lessons/$lessonId", params: { lessonId: l.id }, search: { mode: "edit" } }))}>
                  {l.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data.resources.length > 0 && (
            <CommandGroup heading="资源">
              {data.resources.map((r) => (
                <CommandItem key={r.id} value={`资源 ${r.platform ?? ""} ${r.url ?? ""} ${r.play_status} ${r.copyright_status}`} onSelect={() => go(() => forms.openResource(r))}>
                  {r.platform || "未填写平台"}
                  <span className="ml-auto text-xs text-muted-foreground">{r.clip_id ? data.clipById.get(r.clip_id)?.name : ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data.tasks.length > 0 && (
            <CommandGroup heading="备课行动">
              {data.tasks.map((t) => (
                <CommandItem key={t.id} value={`行动 ${t.title} ${t.task_type} ${t.status}`} onSelect={() => go(() => forms.openTask(t))}>
                  {t.title}
                  <span className="ml-auto text-xs text-muted-foreground">{t.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
