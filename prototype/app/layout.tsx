import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const ogImage = `${protocol}://${host}/og.png`;

  return {
    title: "Arcana｜聆听命运的低语",
    description: "当星光落向牌面，让塔罗揭开此刻隐藏的象征与可能。",
    openGraph: {
      title: "Arcana｜聆听命运的低语",
      description: "带着一个问题踏入牌阵，接受只属于此刻的塔罗启示。",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Arcana 社交预览图" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Arcana｜聆听命运的低语",
      description: "翻开一张牌，看看命运此刻留下了什么线索。",
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
