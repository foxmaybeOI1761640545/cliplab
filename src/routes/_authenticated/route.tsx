import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { allQueries } from "@/lib/db";
import { AppShell } from "@/components/app/app-shell";
import { ErrorState, LoadingState } from "@/components/app/states";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    return { user: data.user };
  },
  loader: async ({ context }) => {
    await Promise.all(allQueries.map((qo) => context.queryClient.ensureQueryData(qo)));
  },
  pendingComponent: () => <LoadingState />,
  errorComponent: AuthedError,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  return <AppShell email={user.email} />;
}

function AuthedError({ error }: { error: unknown }) {
  const router = useRouter();
  return <ErrorState error={error} onRetry={() => router.invalidate()} />;
}
