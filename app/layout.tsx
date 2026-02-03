import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "허그 든든전세 - 매물 검색",
  description: "주택도시보증공사(허그) 든든전세 매물을 지도와 함께 검색하세요. 지역, 보증금, 면적으로 필터링하고 경쟁률을 확인할 수 있습니다.",
  keywords: ["든든전세", "허그", "전세", "주택도시보증공사", "부동산", "매물"],
  openGraph: {
    title: "허그 든든전세 - 매물 검색",
    description: "주택도시보증공사(허그) 든든전세 매물을 지도와 함께 검색하세요.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={
          <div className="h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">로딩 중...</p>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
