import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Remotion AI Studio · AI 视频生成器',
  description: '输入主题，自动生成大纲、文稿与 Remotion 可视化效果，一键导出 MP4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
