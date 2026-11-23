import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  title: 'Học Tiếng Hàn – 한국어 공부 | Ứng dụng học tiếng Hàn cá nhân',
  description:
    'Ứng dụng web tự quản lý và học tiếng Hàn cá nhân hoàn chỉnh: từ vựng, ngữ pháp, flashcard, spaced repetition (SRS), kiểm tra và từ điển cá nhân.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Học Tiếng Hàn',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 antialiased font-sans selection:bg-blue-500 selection:text-white overscroll-none">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
