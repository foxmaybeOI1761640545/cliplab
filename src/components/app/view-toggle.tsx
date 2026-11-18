import { LayoutGrid, Rows3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = "table" | "card";

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ViewMode)}
      className="rounded-md border bg-card p-0.5"
      aria-label="切换视图"
    >
      <ToggleGroupItem value="table" aria-label="表格视图" className="h-8 gap-1 px-2 text-xs">
        <Rows3 className="size-4" />
        <span className="hidden sm:inline">表格</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="card" aria-label="卡片视图" className="h-8 gap-1 px-2 text-xs">
        <LayoutGrid className="size-4" />
        <span className="hidden sm:inline">卡片</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
