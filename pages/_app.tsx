import type { AppProps } from "next/app";

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

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider attribute="class" defaultTheme="light">
        <ToastProvider>
          <Component {...pageProps} />
          <Analytics />
          <SpeedInsights />
        </ToastProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
