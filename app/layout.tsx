import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "허그 든든전세 - 안심 매물 검색",
  description: "주택도시보증공사(HUG)가 인증한 든든전세 매물을 쉽고 안전하게 찾아보세요.",
  keywords: ["든든전세", "허그", "전세", "주택도시보증공사", "안심전세", "부동산"],
  openGraph: {
    title: "허그 든든전세 - 안심 매물 검색",
    description: "주택도시보증공사(HUG)가 인증한 든든전세 매물을 쉽고 안전하게 찾아보세요.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKr.variable} antialiased font-sans bg-background text-foreground`}
      >
        <Suspense fallback={
          <div className="h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-gray-500 font-medium">안심 매물을 불러오는 중...</p>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
