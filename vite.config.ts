// @lovable.dev/vite-tanstack-config supplies the shared React, Tailwind,
// TanStack Start, path-alias, and development-preview plugins.
//
// GitHub Pages is static hosting, so Nitro's server deployment bundle is disabled.
// Supabase is accessed directly from the browser; this project does not call
// TanStack server functions or server routes at runtime.
import { env } from "node:process";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // @ts-expect-error -- The wrapper supports this runtime option, but its published type omits it.
  nitro: false,
  tanstackStart: {
    // Keep the existing server entry for Start's build-time shell rendering.
    server: { entry: "server" },
    // Emit the client-only application shell as the Pages entry document.
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
        crawlLinks: false,
        retryCount: 1,
      },
    },
  },
  vite: {
    // "/" for local development; "/cliplab/" in the GitHub Pages workflow.
    base: env.VITE_BASE_PATH ?? "/",
  },
});
