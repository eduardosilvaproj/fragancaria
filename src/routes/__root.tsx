import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppUpdate } from "../hooks/useAppUpdate";

import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { useCartSync } from "../hooks/useCartSync";
import { initGA, initMetaPixel } from "../lib/analytics";
import { QuickViewModal } from "../components/shop/QuickViewModal";
import { CompareBar } from "../components/shop/CompareBar";
import { useQuickViewStore } from "../stores/quickViewStore";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não pôde ser carregada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Tente atualizar ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-sm border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fragranciaria | Especialista em Cabelo Profissional" },
      { name: "description", content: "Loja premium de produtos capilares profissionais. Kérastase, Wella, Keune, Sebastian e L'Oréal Pro." },
      { property: "og:title", content: "Fragranciaria | Especialista em Cabelo Profissional" },
      { property: "og:description", content: "Loja premium de produtos capilares profissionais. Kérastase, Wella, Keune, Sebastian e L'Oréal Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Fragranciaria | Especialista em Cabelo Profissional" },
      { name: "twitter:description", content: "Loja premium de produtos capilares profissionais. Kérastase, Wella, Keune, Sebastian e L'Oréal Pro." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7fdd8e15-ebcc-42cd-84cf-31115744a75e/id-preview-d7d45804--715d9b39-8a09-4b5d-ac0b-65864ea1ec4d.lovable.app-1781049688536.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7fdd8e15-ebcc-42cd-84cf-31115744a75e/id-preview-d7d45804--715d9b39-8a09-4b5d-ac0b-65864ea1ec4d.lovable.app-1781049688536.png" },
      { name: "twitter:card", content: "summary_large_image" },
      // PWA meta tags
      { name: "theme-color", content: "#0F3A3E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Fragranciaria" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "Fragranciaria" },
      { name: "msapplication-TileColor", content: "#0F3A3E" },
      { name: "msapplication-tap-highlight", content: "no" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: "/images/icon.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/images/icon.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Jost:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { productId, isOpen, closeQuickView } = useQuickViewStore();
  useCartSync();
  useAppUpdate();

  // Initialize analytics on client side
  useEffect(() => {
    initGA();
    initMetaPixel();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" />
      <QuickViewModal
        productId={productId}
        isOpen={isOpen}
        onClose={closeQuickView}
      />
      <CompareBar />
    </QueryClientProvider>
  );
}
