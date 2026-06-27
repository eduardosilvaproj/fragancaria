// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // Override the default cloudflare-module preset from @lovable.dev/vite-tanstack-config
    // Use Vercel preset for proper Vercel serverless function deployment
    preset: 'vercel',
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Separar dados de produtos (grande array de 434 itens)
            if (id.includes('src/data/products')) {
              return 'products-data';
            }
            // Framer motion separado
            if (id.includes('node_modules/framer-motion')) {
              return 'vendor-framer';
            }
            // Lucide icons separado
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000, // Bundle principal inclui TanStack Router
    },
  },
});
