import { Link, useRouterState } from "@tanstack/react-router";
import { Database, Film } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "./nav";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => path === url || path.startsWith(url + "/") || (url === "/animations" && path.startsWith("/episodes"));
  const close = () => isMobile && setOpenMobile(false);

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        <Link to="/dashboard" onClick={close} className="flex items-center gap-2 rounded-md px-1 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Film className="size-4" />
          </span>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block font-display text-sm font-semibold text-sidebar-foreground">动画课堂 ClipLab</span>
              <span className="block truncate text-[11px] text-muted-foreground">主题拆解与剪辑备课</span>
            </span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>备课</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} onClick={close}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/data")} tooltip="导入导出与演示数据">
              <Link to="/data" onClick={close}>
                <Database />
                <span>导入导出 / 演示数据</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
