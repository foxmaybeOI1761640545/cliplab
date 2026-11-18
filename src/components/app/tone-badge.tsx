import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  CLIP_STATUS_TONE,
  COPYRIGHT_TONE,
  PLAY_TONE,
  PRIORITY_TONE,
  STAGES,
  TASK_STATUS_TONE,
  type Tone,
} from "@/lib/constants";

const toneBadge = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium leading-5",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        info: "border-transparent bg-info-soft text-info",
        danger: "border-transparent bg-destructive-soft text-destructive",
        primary: "border-transparent bg-primary-soft text-primary",
        warm: "border-transparent bg-warm-soft text-warm-foreground",
        demo: "border-demo/40 bg-demo-soft text-demo font-semibold tracking-wide",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function ToneBadge({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: Tone | "demo";
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn(toneBadge({ tone }), className)} title={title}>
      {children}
    </span>
  );
}

export const PlayBadge = ({ value }: { value: string }) => (
  <ToneBadge tone={value === "未登记" ? "neutral" : (PLAY_TONE[value] ?? "neutral")} title="播放可用性">
    {value === "未登记" ? "未登记资源" : value}
  </ToneBadge>
);
export const CopyrightBadge = ({ value }: { value: string }) => (
  <ToneBadge
    tone={value === "未登记" ? "neutral" : (COPYRIGHT_TONE[value] ?? "neutral")}
    title="版权/课堂使用"
  >
    {value === "未登记" ? "版权未登记" : value}
  </ToneBadge>
);
export const ClipStatusBadge = ({ value }: { value: string }) => (
  <ToneBadge tone={CLIP_STATUS_TONE[value] ?? "neutral"}>{value}</ToneBadge>
);
export const TaskStatusBadge = ({ value }: { value: string }) => (
  <ToneBadge tone={TASK_STATUS_TONE[value] ?? "neutral"}>{value}</ToneBadge>
);
export const PriorityBadge = ({ value }: { value: string }) => (
  <ToneBadge tone={PRIORITY_TONE[value] ?? "neutral"}>{value}优先</ToneBadge>
);
export const DemoBadge = ({ show }: { show?: boolean | null }) =>
  show ? (
    <ToneBadge tone="demo" title="演示数据，不代表真实可用片段或资源">
      DEMO
    </ToneBadge>
  ) : null;

const stageDot = ["bg-stage-1", "bg-stage-2", "bg-stage-3", "bg-stage-4", "bg-stage-5"];
export function stageDotClass(stage: string | null | undefined) {
  const i = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return i >= 0 ? stageDot[i] : "bg-muted-foreground/40";
}
export const StageBadge = ({ value }: { value: string | null | undefined }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground/80">
    <span className={cn("size-2 rounded-full", stageDotClass(value))} aria-hidden />
    {value || "未设阶段"}
  </span>
);

export const ThemeChips = ({ themes, max = 4 }: { themes: string[] | null | undefined; max?: number }) => {
  const list = themes ?? [];
  if (!list.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.slice(0, max).map((t) => (
        <ToneBadge key={t} tone="primary">
          {t}
        </ToneBadge>
      ))}
      {list.length > max && <ToneBadge>+{list.length - max}</ToneBadge>}
    </span>
  );
};
