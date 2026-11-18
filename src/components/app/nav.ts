import {
  Clapperboard,
  Columns3,
  LayoutDashboard,
  ListOrdered,
  ListTodo,
  Scissors,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: { title: string; url: "/dashboard" | "/animations" | "/clips" | "/themes" | "/lessons" | "/resources" | "/tasks"; icon: LucideIcon }[] = [
  { title: "备课总览", url: "/dashboard", icon: LayoutDashboard },
  { title: "动画与集数", url: "/animations", icon: Clapperboard },
  { title: "片段库", url: "/clips", icon: Scissors },
  { title: "主题对照", url: "/themes", icon: Columns3 },
  { title: "课堂流程", url: "/lessons", icon: ListOrdered },
  { title: "资源核实", url: "/resources", icon: ShieldCheck },
  { title: "备课行动", url: "/tasks", icon: ListTodo },
];

export function pageTitle(pathname: string): string {
  if (pathname.startsWith("/episodes")) return "动画与集数";
  if (pathname.startsWith("/data")) return "导入导出";
  const hit = NAV_ITEMS.find((n) => pathname === n.url || pathname.startsWith(n.url + "/"));
  return hit?.title ?? "工作台";
}
