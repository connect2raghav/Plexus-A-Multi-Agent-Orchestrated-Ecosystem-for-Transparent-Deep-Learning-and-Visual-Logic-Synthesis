import type { AppProps } from "next/app";

import React, { useEffect, useState } from "react";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/router";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { ToastProvider } from "@/components/ToastProvider";
import "@/styles/globals.css";
import "@/styles/nodes.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Defer provider tree to the client to avoid the "Suspense boundary
  // received an update before it finished hydrating" error.  next-themes
  // fires a useEffect that sets the theme class during hydration, which
  // collides with React 18 / Next 15's internal dehydrated boundaries.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // SSR + first client render: plain HTML, no providers.
    // This avoids the hydration mismatch entirely.
    return (
      <>
        <Component {...pageProps} />
        <Analytics />
        <SpeedInsights />
      </>
    );
  }

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider
        disableTransitionOnChange
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
      >
        <ToastProvider>
          <Component {...pageProps} />
          <Analytics />
          <SpeedInsights />
        </ToastProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
