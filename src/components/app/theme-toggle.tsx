import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemePreference, type ThemePreference } from "./theme-provider";

const OPTIONS: { value: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { value: "light", label: "浅色主题", description: "明亮的纸张感界面", icon: Sun },
  { value: "dark", label: "深色主题", description: "柔和的深灰蓝界面", icon: Moon },
  { value: "system", label: "跟随系统", description: "自动匹配设备外观", icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useThemePreference();
  const CurrentIcon = OPTIONS.find((option) => option.value === preference)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0" aria-label="切换外观主题" title="外观主题">
          <CurrentIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>外观主题</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = preference === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setPreference(option.value)}
              className="flex items-center gap-2 py-2"
              aria-checked={selected}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
              {selected && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
