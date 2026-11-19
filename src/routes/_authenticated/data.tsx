import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Database, Download, FileJson, HardDrive, Upload } from "lucide-react";
import { PageHeader } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exportLocalBackup, importLocalBackup, useAllData, useDb, type TableName } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/data")({
  head: () => ({
    meta: [
      { title: "数据备份与恢复 · 动画课堂 ClipLab" },
      { name: "description", content: "导出和恢复本地备课资料" },
    ],
  }),
  component: DataManagementPage,
});

const COUNT_ITEMS: { key: TableName; label: string }[] = [
  { key: "animations", label: "动画作品" },
  { key: "episodes", label: "集数" },
  { key: "clips", label: "片段" },
  { key: "resources", label: "资源记录" },
  { key: "lesson_plans", label: "课堂方案" },
  { key: "lesson_items", label: "课堂环节" },
  { key: "action_tasks", label: "备课行动" },
];

function DataManagementPage() {
  const data = useAllData();
  const db = useDb();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  const counts: Record<TableName, number> = {
    animations: data.animations.length,
    episodes: data.episodes.length,
    clips: data.clips.length,
    resources: data.resources.length,
    lesson_plans: data.lessonPlans.length,
    lesson_items: data.lessonItems.length,
    action_tasks: data.tasks.length,
  };
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const handleExport = async () => {
    setBusy("export");
    try {
      const json = await exportLocalBackup();
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `cliplab-local-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("本地资料备份已导出");
    } catch (error) {
      toast.error((error as Error).message || "导出失败");
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    const confirmed = window.confirm(
      "恢复备份会替换当前浏览器中的全部 ClipLab 本地资料。建议先导出一份当前备份。确定继续吗？",
    );
    if (!confirmed) return;
    setBusy("import");
    try {
      const counts = await importLocalBackup(await file.text());
      await db.refresh();
      const imported = Object.values(counts).reduce((sum, value) => sum + value, 0);
      toast.success(`恢复完成，共导入 ${imported} 条记录`);
      setFile(null);
    } catch (error) {
      toast.error((error as Error).message || "恢复失败");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="数据备份与恢复"
        description="ClipLab 当前使用浏览器 IndexedDB 保存资料，不需要账号或云端数据库。"
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="secondary"><HardDrive className="mr-1 size-3" />本地优先</Badge>
        <Badge variant="outline">无需登录</Badge>
        <Badge variant="outline">资料不上传云端</Badge>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <CardTitle>本地资料概况</CardTitle>
          </div>
          <CardDescription>这些记录保存在当前浏览器的 IndexedDB 中，不会自动上传到 Supabase。首次打开网站仍需联网加载页面资源。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {COUNT_ITEMS.map((item) => (
              <div key={item.key} className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{counts[item.key]}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">当前共保存 {total} 条记录。</p>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="size-5 text-primary" />
              <CardTitle>导出完整备份</CardTitle>
            </div>
            <CardDescription>
              将动画、集数、片段、资源、课堂方案、课堂环节和备课行动打包为一个 JSON 文件。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 text-foreground">
                <FileJson className="size-5" />
                ClipLab 本地备份（JSON）
              </div>
              备份包含资料字段、关联 ID 和创建/更新时间，可在另一台设备的 ClipLab 中恢复。
            </div>
            <Button onClick={handleExport} disabled={busy !== null} className="w-full">
              <Download className="size-4" />
              {busy === "export" ? "正在导出…" : "导出 JSON 备份"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              <CardTitle>从备份恢复</CardTitle>
            </div>
            <CardDescription>
              选择之前由 ClipLab 导出的 JSON 文件。恢复时会替换当前浏览器中的全部本地资料。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".json,application/json"
              disabled={busy !== null}
              onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
            />
            {file && <p className="break-all text-xs text-muted-foreground">已选择：{file.name}</p>}
            <Button onClick={handleImport} disabled={!file || busy !== null} variant="outline" className="w-full">
              <Upload className="size-4" />
              {busy === "import" ? "正在恢复…" : "恢复所选备份"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">重要：本地资料只属于当前浏览器</p>
            <p className="text-muted-foreground">
              清除浏览器网站数据、使用无痕窗口或更换浏览器/设备，可能导致资料无法继续访问。请定期导出备份。JSON 备份保存的是文字资料、时间码和资源链接，不包含视频文件本身。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
