import { createFileRoute, useRouter } from "@tanstack/react-router";
import { allQueries } from "@/lib/db";
import { AppShell } from "@/components/app/app-shell";
import { ErrorState, LoadingState } from "@/components/app/states";

export const Route = createFileRoute("/_authenticated")({
  // All user data is stored in this browser's IndexedDB. No account is required.
  ssr: false,
  loader: async ({ context }) => {
    await Promise.all(allQueries.map((query) => context.queryClient.ensureQueryData(query)));
  },
  pendingComponent: () => <LoadingState label="正在读取本地备课资料…" />,
  errorComponent: AuthedError,
  component: () => <AppShell />,
});

function AuthedError({ error }: { error: unknown }) {
  const router = useRouter();
  return <ErrorState error={error} onRetry={() => router.invalidate()} />;
}
