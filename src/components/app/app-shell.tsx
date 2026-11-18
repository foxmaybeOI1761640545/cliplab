import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Plus, UserRound } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "./app-sidebar";
import { GlobalSearch } from "./global-search";
import { FormsProvider, useForms } from "./forms-context";
import { ConfirmProvider } from "./confirm-context";
import { pageTitle } from "./nav";

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

function UserMenu({ email }: { email?: string | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="账户">
          <UserRound className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-56 truncate text-xs font-normal text-muted-foreground">{email ?? "已登录"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut className="size-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ email }: { email?: string | null }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <ConfirmProvider>
      <FormsProvider>
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
                <div className="flex flex-1 justify-center">
                  <GlobalSearch />
                </div>
                <QuickAdd />
                <UserMenu email={email} />
              </header>
              <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-6 sm:py-7 print:max-w-none print:p-0">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </FormsProvider>
    </ConfirmProvider>
  );
}
