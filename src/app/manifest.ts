import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Học Tiếng Hàn – 한국어 공부',
    short_name: 'HocTiengHan',
    description: 'Ứng dụng học tiếng Hàn cá nhân hoàn chỉnh: từ vựng, ngữ pháp, flashcard và bài kiểm tra.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
