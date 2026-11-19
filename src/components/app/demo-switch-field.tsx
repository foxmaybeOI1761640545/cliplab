import { Switch } from "@/components/ui/switch";

export function DemoSwitchField({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-3">
      <div className="min-w-0">
        <label htmlFor="record-demo-switch" className="cursor-pointer text-sm font-medium text-foreground">
          标记为 DEMO 演示数据
        </label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          仅用于演示或压力测试。开启后会显示 DEMO 标签，并且不会被自动备课建议当作真实资料。
        </p>
      </div>
      <Switch
        id="record-demo-switch"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label="标记为 DEMO 演示数据"
      />
    </div>
  );
}
