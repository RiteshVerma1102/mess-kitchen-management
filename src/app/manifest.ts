import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart Mess Kitchen & Attendance System',
    short_name: 'SmartMess',
    description: 'Offline-First Student Attendance & Food Waste Forecasting Platform',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#faf9f6',
    theme_color: '#166534',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
