import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const ogImage = `${protocol}://${host}/og.png`;

  return {
    title: "Arcana｜在牌面中，与命运短暂对视",
    description: "夜色沉静，星轨微响。一个克制而沉浸的塔罗自我探索体验原型。",
    openGraph: {
      title: "Arcana｜在牌面中，与命运短暂对视",
      description: "带着一个问题而来，听沉默的牌面轻轻应一声。",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Arcana 社交预览图" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Arcana｜在牌面中，与命运短暂对视",
      description: "星轨低语，牌面应心。",
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
