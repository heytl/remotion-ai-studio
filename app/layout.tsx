import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Remotion AI Studio · AI 视频生成器',
  description: '输入主题，自动生成大纲、文稿与 Remotion 可视化效果，一键导出 MP4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen antialiased">
        <a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only">
          跳到主要内容
        </a>
        {children}
      </body>
    </html>
  );
}
