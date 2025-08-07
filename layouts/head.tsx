import React from "react";
import NextHead from "next/head";

import { siteConfig } from "@/config/site";

interface HeadProps {
  title?: string;
  description?: string;
}

export const Head = ({ title, description }: HeadProps) => {
  const pageTitle = title
    ? `${title} - ${siteConfig.name}`
    : `${siteConfig.name} - Visual Neural Network Designer`;
  const pageDescription = description || siteConfig.description;

  return (
    <NextHead>
      <title>{pageTitle}</title>
      <meta key="title" content={pageTitle} property="og:title" />
      <meta content={pageDescription} property="og:description" />
      <meta content={pageDescription} name="description" />
      <meta
        content="neural network, AI, machine learning, visual designer, drag and drop, tensorflow, pytorch"
        name="keywords"
      />
      <meta content="NeoD Team" name="author" />
      <meta
        key="viewport"
        content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        name="viewport"
      />

      {/* Favicon and App Icons */}
      <link href="/favicon.png" rel="icon" type="image/png" />
      <link href="/favicon.ico" rel="alternate icon" />
      <link href="/favicon.png" rel="apple-touch-icon" />

      {/* Open Graph */}
      <meta content="website" property="og:type" />
      <meta content="NeoD" property="og:site_name" />
      <meta content="/favicon.png" property="og:image" />

      {/* Twitter Card */}
      <meta content="summary" name="twitter:card" />
      <meta content="@neod_ai" name="twitter:site" />
      <meta content="/favicon.png" name="twitter:image" />
    </NextHead>
  );
};
