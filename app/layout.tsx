import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '行程安排工具',
  description: '多日行程规划 — 自然语言输入，结构化输出，路线优化',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
