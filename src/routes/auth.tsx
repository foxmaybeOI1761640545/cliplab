import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Film, Loader2 } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/app/form-bits";

type AuthSearch = { redirect?: string };
const safePath = (p: string | undefined | null) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard");
const STORE_KEY = "cliplab.redirect";

// Build absolute callback URLs from Vite's configured base so GitHub Pages' /cliplab/
// prefix is preserved. This also remains correct for root-hosted local/Lovable previews.
const appUrl = (path: string) =>
  new URL(path.replace(/^\/+/, ""), new URL(import.meta.env.BASE_URL, window.location.origin)).toString();

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const stored = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(STORE_KEY) : null;
      sessionStorage.removeItem(STORE_KEY);
      throw redirect({ to: safePath(search.redirect ?? stored) });
    }
  },
  head: () => ({
    meta: [
      { title: "登录 · 动画课堂 ClipLab" },
      { name: "description", content: "登录你的 ClipLab 备课工作台，管理动画片段与课堂流程。" },
      { property: "og:title", content: "登录 · 动画课堂 ClipLab" },
      { property: "og:description", content: "登录你的 ClipLab 备课工作台。" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const GoogleLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const target = safePath(search.redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [sentConfirm, setSentConfirm] = useState(false);

  const done = () => navigate({ to: target, replace: true });

  const emailAuth = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("请输入有效的邮箱地址");
    if (mode !== "forgot" && password.length < 6) return toast.error("密码至少 6 位");
    setBusy("email");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        done();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: appUrl("auth") },
        });
        if (error) throw error;
        if (data.session) done();
        else setSentConfirm(true);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: appUrl("reset-password"),
        });
        if (error) throw error;
        toast.success("重置密码邮件已发送，请查收");
      }
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(/Invalid login/i.test(msg) ? "邮箱或密码不正确" : /registered/i.test(msg) ? "该邮箱已注册，请直接登录" : msg);
    } finally {
      setBusy(null);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    setBusy(provider);
    sessionStorage.setItem(STORE_KEY, target);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: appUrl("auth") });
    if (result.error) {
      toast.error("登录失败，请稍后重试");
      setBusy(null);
      return;
    }
    if (result.redirected) return;
    sessionStorage.removeItem(STORE_KEY);
    done();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-raised sm:p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Film className="size-4" />
          </span>
          <span>
            <span className="block font-display font-semibold">动画课堂 ClipLab</span>
            <span className="block text-xs text-muted-foreground">个人备课工作台 · 数据仅自己可见</span>
          </span>
        </Link>

        {sentConfirm ? (
          <div className="space-y-3 text-sm">
            <h1 className="text-xl font-semibold">请查收确认邮件</h1>
            <p className="text-muted-foreground">我们已向 {email} 发送确认链接，点击后即可登录。若未收到，请检查垃圾邮件箱。</p>
            <Button variant="outline" onClick={() => { setSentConfirm(false); setMode("signin"); }}>
              返回登录
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Button type="button" variant="outline" className="h-10 w-full" onClick={() => oauth("google")} disabled={!!busy}>
                {busy === "google" ? <Loader2 className="animate-spin" /> : <GoogleLogo />}
                使用 Google 继续
              </Button>
              <Button type="button" variant="outline" className="h-10 w-full" onClick={() => oauth("lovable")} disabled={!!busy}>
                {busy === "lovable" ? <Loader2 className="animate-spin" /> : <LovableMark className="size-[18px]" />}
                使用 Lovable 继续
              </Button>
            </div>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />或使用邮箱<span className="h-px flex-1 bg-border" />
            </div>
            <Tabs value={mode === "forgot" ? "signin" : mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="signin">登录</TabsTrigger>
                <TabsTrigger value="signup">注册</TabsTrigger>
              </TabsList>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  emailAuth();
                }}
                className="space-y-4"
              >
                <Field label="邮箱" htmlFor="au-email">
                  <Input id="au-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                {mode !== "forgot" && (
                  <Field label="密码" htmlFor="au-pass" hint={mode === "signup" ? "至少 6 位" : undefined}>
                    <Input
                      id="au-pass"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                )}
                <TabsContent value="signin" className="m-0" />
                <TabsContent value="signup" className="m-0" />
                <Button type="submit" className="h-10 w-full" disabled={!!busy}>
                  {busy === "email" && <Loader2 className="animate-spin" />}
                  {mode === "signin" ? "登录" : mode === "signup" ? "创建账户" : "发送重置邮件"}
                </Button>
                {mode !== "signup" && (
                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setMode(mode === "forgot" ? "signin" : "forgot")}
                  >
                    {mode === "forgot" ? "返回密码登录" : "忘记密码？"}
                  </button>
                )}
              </form>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
