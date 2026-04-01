import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "창의적 개념 탐색 실험",
  description: "Generative AI 기반 연구용 프로토타입",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50">{children}</body>
    </html>
  );
}
