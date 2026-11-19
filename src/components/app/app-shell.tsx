import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { HardDrive, Plus } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "./app-sidebar";
import { GlobalSearch } from "./global-search";
import { FormsProvider, useForms } from "./forms-context";
import { ConfirmProvider } from "./confirm-context";
import { pageTitle } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import { AllDataProvider } from "@/lib/db";

function QuickAdd() {
  const f = useForms();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-9 gap-1.5" aria-label="快速新增">
          <Plus className="size-4" />
          <span className="hidden sm:inline">快速新增</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => f.openAnimation()}>动画作品</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => f.openEpisode()}>集数</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => f.openClip()}>片段</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => f.openResource()}>资源记录</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => f.openLesson()}>课堂方案</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => f.openTask()}>备课行动</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LocalStorageMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="本地数据管理">
          <HardDrive className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>本地存储模式</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/data">数据备份与恢复</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <ConfirmProvider>
      <FormsProvider>
        <AllDataProvider>
          <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="min-w-0 bg-background">
              <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:gap-3 sm:px-5 print:hidden">
                <SidebarTrigger aria-label="展开或收起导航" />
                <div className="hidden min-w-0 shrink-0 lg:block">
                  <p className="text-[11px] leading-none text-muted-foreground">当前工作区</p>
                  <p className="truncate font-display text-sm font-semibold">我的备课 · {pageTitle(path)}</p>
                </div>
                <div className="flex flex-1 justify-center"><GlobalSearch /></div>
                <Badge variant="secondary" className="hidden sm:inline-flex">本地模式</Badge>
                <ThemeToggle />
                <QuickAdd />
                <LocalStorageMenu />
              </header>
              <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-6 sm:py-7 print:max-w-none print:p-0">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
          </SidebarProvider>
        </AllDataProvider>
      </FormsProvider>
    </ConfirmProvider>
  );
}
