import { Html, Head, Main, NextScript } from "next/document";
import clsx from "clsx";

import { fontSans, fontMono } from "@/config/fonts";

export default function Document() {
  return (
    // suppressHydrationWarning prevents next-themes localStorage read from
    // causing a "Suspense boundary received update before hydrating" error.
    <Html lang="en" suppressHydrationWarning>
      <Head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontMono.variable,
        )}
      >
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
