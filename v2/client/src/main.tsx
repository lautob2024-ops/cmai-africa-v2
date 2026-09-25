import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        const code = (error as TRPCClientError<any>)?.data?.code;
        if (["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "BAD_REQUEST"].includes(code)) return false;
        return count < 2;
      },
    },
  },
});

const redirectIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError) || error.message !== UNAUTHED_ERR_MSG) return;
  if (!["/access", "/", "/decouvrir", "/a-propos"].includes(window.location.pathname)) window.location.href = "/access";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") redirectIfUnauthorized(event.query.state.error);
});
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") redirectIfUnauthorized(event.mutation.state.error);
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: (input, init) => globalThis.fetch(input, { ...(init ?? {}), credentials: "include" }),
    }),
  ],
});

// Image manquante (logo ou photo pas encore déposée dans /images) : on affiche un visuel de remplacement.
document.addEventListener(
  "error",
  event => {
    const target = event.target;
    if (target instanceof HTMLImageElement && !target.dataset.fallback && target.src.includes("/images/")) {
      target.dataset.fallback = "1";
      target.src = /logo/i.test(target.src) ? "/images/logo-fallback.svg" : "/images/photo-fallback.svg";
    }
  },
  true,
);

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>,
);
