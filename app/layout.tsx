import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "키워드 이슈 보고서",
  description: "키워드 기반 최근 7일 주요 이슈 자동 보고서 생성 및 이메일 발송",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
