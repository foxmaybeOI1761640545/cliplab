import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/form-bits";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "重设密码 · 动画课堂 ClipLab" },
      { name: "description", content: "为你的 ClipLab 备课账户设置新密码。" },
      { property: "og:title", content: "重设密码 · 动画课堂 ClipLab" },
      { property: "og:description", content: "为你的 ClipLab 备课账户设置新密码。" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (pwd.length < 6) return toast.error("密码至少 6 位");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("密码已更新");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-raised"
      >
        <h1 className="text-xl font-semibold">设置新密码</h1>
        {!ready && <p className="text-sm text-muted-foreground">请通过邮件中的重置链接打开此页面。</p>}
        <Field label="新密码" htmlFor="rp-pwd">
          <Input id="rp-pwd" type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} disabled={!ready} />
        </Field>
        <Button type="submit" className="w-full" disabled={!ready || busy}>
          {busy && <Loader2 className="animate-spin" />}
          保存新密码
        </Button>
      </form>
    </div>
  );
}
