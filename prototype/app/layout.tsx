import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const ogImage = `${protocol}://${host}/og.png`;

  return {
    title: "Arcana｜在牌面中，看见当下",
    description: "一个克制、沉浸的塔罗自我探索体验原型。",
    openGraph: {
      title: "Arcana｜在牌面中，看见此刻的自己",
      description: "带着一个问题而来，借一张牌照见被忽略的感受与可能。",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Arcana 社交预览图" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Arcana｜在牌面中，看见此刻的自己",
      description: "一个克制、沉浸的塔罗自我探索体验。",
      images: [ogImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
