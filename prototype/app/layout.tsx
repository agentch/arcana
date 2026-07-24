import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const ogImage = `${protocol}://${host}/og.png`;

  return {
    title: "阿卡纳星语｜在牌面中整理思绪",
    description: "夜色沉静，星光微亮。一个克制而沉浸的卡牌自我反思体验。",
    openGraph: {
      title: "阿卡纳星语｜在牌面中整理思绪",
      description: "带着一个问题而来，从牌面获得一种新的观察角度。",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Arcana 社交预览图" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "阿卡纳星语｜在牌面中整理思绪",
      description: "借一张牌，安静整理此刻的想法。",
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
